#!/usr/bin/env python3
"""Host-side encrypted PostgreSQL backups and health alerts. No secrets in logs."""
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def required(name):
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"Missing {name}")
    return value


def compose(*args):
    return ["docker", "compose", "--project-name", "online-exam", "--env-file",
            required("COMPOSE_ENV_FILE"), "-f", str(ROOT / "deploy/compose.production.yml"), *args]


def state_dir():
    path = Path(os.environ.get("OPS_STATE_DIR", "/var/lib/online-exam"))
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    return path


def notify(message):
    url = required("ALERT_WEBHOOK_URL")
    if not url.startswith("https://"):
        raise ValueError("Alert webhook must use HTTPS")
    # Generic messages only: no command output, provider errors or credentials.
    request = urllib.request.Request(url, data=json.dumps({"text": message}).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=15) as response:
        if response.status >= 300:
            raise RuntimeError("Alert delivery failed")


def backup():
    recipient = required("AGE_RECIPIENT")
    destination = required("BACKUP_S3_URI").rstrip("/")
    if not destination.startswith("s3://") or destination == "s3:":
        raise ValueError("Backup destination must be an S3 bucket/prefix")
    state = state_dir()
    with (state / "backup.lock").open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        # Plaintext dump is streamed straight to age and never written to disk.
        with tempfile.TemporaryDirectory(prefix="backup-", dir=state) as temp:
            encrypted = Path(temp) / (time.strftime("exam-%Y%m%dT%H%M%SZ", time.gmtime()) + ".dump.age")
            dump = subprocess.Popen(compose("exec", "-T", "postgres", "sh", "-ec",
                'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl'),
                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            try:
                result = subprocess.run(["age", "--recipient", recipient, "--output", str(encrypted)],
                    stdin=dump.stdout, stderr=subprocess.DEVNULL, timeout=3600)
                dump.stdout.close()
                if dump.wait(timeout=30) != 0 or result.returncode != 0 or encrypted.stat().st_size == 0:
                    raise RuntimeError("Dump/encryption failed")
            finally:
                if dump.poll() is None:
                    dump.kill()
                    dump.wait()
            subprocess.run(["aws", "s3", "cp", str(encrypted), destination + "/" + encrypted.name,
                            "--only-show-errors"], check=True, timeout=3600,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        # Marker changes only after confirmed off-host upload.
        pending = state / "backup-success.tmp"
        pending.write_text(str(time.time()))
        pending.replace(state / "backup-success")


def monitor():
    url = required("HEALTH_URL")
    if not url.startswith("https://"):
        raise ValueError("Health URL must use HTTPS")
    state = state_dir()
    failures = []
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            body = json.loads(response.read(65536))
            if response.status != 200 or body.get("status") != "ok":
                failures.append("API health check failed")
    except Exception:
        failures.append("API health check failed")
    try:
        age = time.time() - float((state / "backup-success").read_text())
        if age < 0 or age > 30 * 3600:
            failures.append("No successful backup in the last 30 hours")
    except (OSError, ValueError):
        failures.append("No successful backup recorded")
    if shutil.disk_usage(state).free < 2 * 1024**3:
        failures.append("Host disk space below 2 GiB")
    previous = state / "alert-state.json"
    try:
        last = json.loads(previous.read_text())
    except (OSError, ValueError):
        last = {}
    message = "; ".join(failures)
    if failures and (last.get("message") != message or time.time() - last.get("sent", 0) > 3600):
        notify("Online exam: " + message)
        previous.write_text(json.dumps({"message": message, "sent": time.time()}))
    elif not failures and last.get("message"):
        notify("Online exam: health, backup freshness and disk checks recovered")
        previous.write_text("{}")
    return not failures


def main():
    os.umask(0o077)
    try:
        if sys.argv[1:] == ["backup"]:
            try:
                backup()
            except Exception:
                notify("Online exam: encrypted backup failed; inspect the host")
                raise
        elif sys.argv[1:] == ["monitor"]:
            return 0 if monitor() else 1
        else:
            raise ValueError("Usage: ops.py backup|monitor")
    except Exception:
        print("Operation failed; check configuration and service availability (secrets suppressed)", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

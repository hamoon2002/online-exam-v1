import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from unittest.mock import MagicMock, patch

spec = importlib.util.spec_from_file_location("ops", Path(__file__).parents[1] / "ops.py")
ops = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ops)


class OperationsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.state = Path(self.temp.name)
        self.env = patch.dict(os.environ, {
            "OPS_STATE_DIR": self.temp.name, "HEALTH_URL": "https://exam.invalid/api/health",
            "ALERT_WEBHOOK_URL": "https://alerts.invalid/hook", "COMPOSE_ENV_FILE": "/private/compose.env",
            "AGE_RECIPIENT": "age1public", "BACKUP_S3_URI": "s3://backups/exam"})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.addCleanup(self.temp.cleanup)

    def response(self, body):
        response = MagicMock()
        response.__enter__.return_value = response
        response.status = 200
        response.read.return_value = json.dumps(body).encode()
        return response

    @patch.object(ops, "notify")
    @patch.object(ops.urllib.request, "urlopen")
    def test_health_failure_missing_backup_and_recovery(self, request, notify):
        request.return_value = self.response({"status": "error"})
        self.assertFalse(ops.monitor())
        self.assertIn("health check failed", notify.call_args.args[0])
        self.assertIn("No successful backup", notify.call_args.args[0])
        ops.monitor()
        self.assertEqual(notify.call_count, 1)  # deduplicate for an hour
        (self.state / "backup-success").write_text(str(time.time()))
        request.return_value = self.response({"status": "ok"})
        self.assertTrue(ops.monitor())
        self.assertIn("recovered", notify.call_args.args[0])

    @patch.object(ops, "notify", side_effect=RuntimeError("receiver down"))
    @patch.object(ops.urllib.request, "urlopen", side_effect=OSError("offline"))
    def test_failed_alert_does_not_suppress_retry(self, request, notify):
        with self.assertRaises(RuntimeError):
            ops.monitor()
        self.assertFalse((self.state / "alert-state.json").exists())

    @patch.object(ops, "notify")
    @patch.object(ops.urllib.request, "urlopen")
    def test_stale_backup(self, request, notify):
        request.return_value = self.response({"status": "ok"})
        (self.state / "backup-success").write_text(str(time.time() - 31 * 3600))
        self.assertFalse(ops.monitor())
        self.assertIn("30 hours", notify.call_args.args[0])

    def test_dump_failure_never_uploads_or_marks_success(self):
        dump = MagicMock()
        dump.wait.return_value = 1
        dump.poll.return_value = 1
        with patch.object(ops.subprocess, "Popen", return_value=dump), patch.object(ops.subprocess, "run") as run:
            run.return_value.returncode = 0
            with self.assertRaises(RuntimeError):
                ops.backup()
            self.assertEqual(run.call_count, 1)
            self.assertFalse((self.state / "backup-success").exists())

    def test_upload_failure_preserves_previous_success_marker(self):
        marker = self.state / "backup-success"
        marker.write_text("123")
        dump = MagicMock()
        dump.wait.return_value = 0
        dump.poll.return_value = 0

        def run(args, **kwargs):
            if args[0] == "age":
                Path(args[-1]).write_bytes(b"encrypted")
                return subprocess.CompletedProcess(args, 0)
            raise subprocess.CalledProcessError(1, args)

        with patch.object(ops.subprocess, "Popen", return_value=dump), patch.object(ops.subprocess, "run", side_effect=run):
            with self.assertRaises(subprocess.CalledProcessError):
                ops.backup()
        self.assertEqual(marker.read_text(), "123")
        self.assertFalse(list(self.state.glob("backup-*/*")))


if __name__ == "__main__":
    unittest.main()

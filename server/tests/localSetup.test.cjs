const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

test('fresh local setup generates unique private credentials and is idempotent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-setup-'));
  try {
    for (const dir of ['scripts', 'server', 'client'])
      fs.mkdirSync(path.join(root, dir));
    for (const file of [
      'scripts/setup-local.cjs',
      'server/.env.example',
      'client/.env.example',
    ])
      fs.copyFileSync(
        path.resolve(__dirname, '../..', file),
        path.join(root, file),
      );
    const run = () =>
      spawnSync(
        process.execPath,
        [path.join(root, 'scripts/setup-local.cjs')],
        { encoding: 'utf8' },
      );
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    const env = fs.readFileSync(path.join(root, '.env'), 'utf8');
    const server = fs.readFileSync(path.join(root, 'server/.env'), 'utf8');
    const values = Object.fromEntries(
      env
        .trim()
        .split('\n')
        .map((line) => line.split('=')),
    );
    for (const key of [
      'POSTGRES_PASSWORD',
      'REDIS_PASSWORD',
      'MINIO_ROOT_PASSWORD',
    ]) {
      assert.match(values[key], /^[a-f0-9]{64}$/);
      assert.ok(server.includes(values[key]));
      assert.ok(!first.stdout.includes(values[key]));
    }
    assert.equal(
      new Set([
        values.POSTGRES_PASSWORD,
        values.REDIS_PASSWORD,
        values.MINIO_ROOT_PASSWORD,
      ]).size,
      3,
    );
    assert.equal(fs.statSync(path.join(root, '.env')).mode & 0o777, 0o600);
    assert.equal(
      fs.statSync(path.join(root, 'server/.env')).mode & 0o777,
      0o600,
    );
    assert.equal(run().status, 0);
    assert.equal(fs.readFileSync(path.join(root, '.env'), 'utf8'), env);
    assert.equal(
      fs.readFileSync(path.join(root, 'server/.env'), 'utf8'),
      server,
    );
    fs.appendFileSync(
      path.join(root, 'server/.env'),
      '\nNODE_ENV=production\n',
    );
    assert.notEqual(run().status, 0);
    assert.equal(fs.readFileSync(path.join(root, '.env'), 'utf8'), env);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

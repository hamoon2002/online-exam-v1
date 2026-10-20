const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

for (const scenario of ['success', 'migration-failure', 'health-failure']) {
  test(`staging deployment: ${scenario}`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-deploy-'));
    try {
      fs.writeFileSync(path.join(dir, 'server.env'), 'NODE_ENV=production\n');
      fs.writeFileSync(
        path.join(dir, 'state.json'),
        JSON.stringify(['online-exam-staging']),
      );
      fs.writeFileSync(path.join(dir, 'sleep'), '#!/bin/sh\nexit 0\n', {
        mode: 0o755,
      });
      fs.writeFileSync(
        path.join(dir, 'docker'),
        `#!/usr/bin/env node
const fs = require('node:fs'), path = require('node:path');
const args = process.argv.slice(2), dir = process.env.TEST_DEPLOY_DIR;
const stateFile = path.join(dir, 'state.json');
let names = JSON.parse(fs.readFileSync(stateFile));
fs.appendFileSync(path.join(dir, 'calls'), JSON.stringify(args) + '\\n');
let status = 0;
if (args[0] === 'container') status = names.includes(args.at(-1)) ? 0 : 1;
if (args[0] === 'run' && args.includes('--rm')) status = process.env.TEST_DEPLOY_SCENARIO === 'migration-failure' ? 1 : 0;
if (args[0] === 'run' && args.includes('-d')) names.push('online-exam-staging');
if (args[0] === 'rename') names = names.map(n => n === args[1] ? args[2] : n);
if (args[0] === 'rm') names = names.filter(n => n !== args.at(-1));
if (args[0] === 'inspect') console.log(process.env.TEST_DEPLOY_SCENARIO === 'health-failure' ? 'unhealthy' : 'healthy');
fs.writeFileSync(stateFile, JSON.stringify(names));
process.exitCode = status;
`,
        { mode: 0o755 },
      );
      const result = spawnSync(
        'bash',
        [
          path.resolve(__dirname, '../../deploy/staging.sh'),
          `ghcr.io/owner/exam:${'a'.repeat(40)}`,
        ],
        {
          env: {
            ...process.env,
            PATH: `${dir}:${process.env.PATH}`,
            DEPLOY_ENV_FILE: path.join(dir, 'server.env'),
            TEST_DEPLOY_DIR: dir,
            TEST_DEPLOY_SCENARIO: scenario,
          },
          encoding: 'utf8',
          timeout: 15000,
        },
      );
      assert.ifError(result.error);
      assert.equal(
        result.status,
        scenario === 'success' ? 0 : 1,
        result.stderr,
      );
      const calls = fs
        .readFileSync(path.join(dir, 'calls'), 'utf8')
        .trim()
        .split('\n')
        .map(JSON.parse);
      assert.equal(
        calls.some((c) => c[0] === 'stop'),
        scenario !== 'migration-failure',
      );
      assert.equal(
        calls.some((c) => c[0] === 'start'),
        scenario === 'health-failure',
      );
      assert.ok(
        JSON.parse(fs.readFileSync(path.join(dir, 'state.json'))).includes(
          'online-exam-staging',
        ),
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

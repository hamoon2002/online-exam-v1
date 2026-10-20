const { readdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

function discover(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return discover(path);
      return /\.test\.(?:ts|cjs|mjs|js)$/.test(entry.name) ? [path] : [];
    })
    .sort();
}
const cwd = resolve(__dirname, '..');
const files = discover(join(cwd, 'tests'));
if (!files.length) throw new Error('No server tests discovered');
const result = spawnSync(
  process.execPath,
  [
    '--require',
    './tests/loadTestEnv.cjs',
    '--require',
    'ts-node/register/transpile-only',
    '--test',
    ...files,
  ],
  { cwd, stdio: 'inherit', env: process.env },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(
  fs.readFileSync(require.resolve('../src/services/otpSender.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
function load(fetch) {
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module,
    exports: module.exports,
    AbortSignal,
    URLSearchParams,
    fetch,
    require: (name) => {
      if (name.endsWith('/logger')) return { logEvent() {} };
      if (name.endsWith('/env'))
        return {
          env: {
            NODE_ENV: 'production',
            RESEND_API_KEY: 'test-key',
            OTP_EMAIL_FROM: 'otp@exam-platform.ir',
          },
        };
      throw Error(name);
    },
  });
  return module.exports.sendOtp;
}
test('email uses configured sender and a failed provider response is not silent or logged verbatim', async () => {
  let sent;
  const send = load(async (_url, options) => {
    sent = JSON.parse(options.body);
    return { ok: true };
  });
  await send({
    identifier: 'student@example.test',
    channel: 'EMAIL',
    code: '123456',
  });
  assert.equal(sent.from, 'otp@exam-platform.ir');
  assert.equal(sent.to, 'student@example.test');
  const failed = load(async () => ({
    ok: false,
    status: 403,
    text: async () => 'sensitive provider response',
  }));
  await assert.rejects(
    failed({
      identifier: 'student@example.test',
      channel: 'EMAIL',
      code: '123456',
    }),
    (error) =>
      error.message.includes('403') && !error.message.includes('sensitive'),
  );
});

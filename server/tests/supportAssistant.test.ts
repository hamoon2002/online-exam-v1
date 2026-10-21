import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assistantAnswer,
  assistantInput,
  localAnswer,
} from '../src/lib/supportAssistant';
test('free guide is local, honest and validates bounded input', async () => {
  process.env.ASSISTANT_PROVIDER = 'local';
  const result = await assistantAnswer('ثبت نام', (() => {
    throw new Error('network must not be used');
  }) as typeof fetch);
  assert.equal(result.mode, 'local');
  assert.match(result.answer, /کد تأیید/);
  assert.match(localAnswer('ناشناخته'), /مدل هوش مصنوعی متصل نیستم/);
  assert.equal(
    assistantInput.safeParse({ message: 'x'.repeat(2001) }).success,
    false,
  );
  assert.equal(
    assistantInput.safeParse({
      message: 'hi',
      endpoint: 'https://attacker.test',
    }).success,
    false,
  );
});
for (const provider of ['openai-compatible', 'anthropic'])
  test(`${provider} adapter sends only explicit question and public guide; failures fall back safely`, async () => {
    process.env.ASSISTANT_PROVIDER = provider;
    process.env.ASSISTANT_MODEL = 'test-model';
    process.env.ASSISTANT_API_KEY = 'private-key';
    process.env.ASSISTANT_BASE_URL = 'https://provider.example/v1';
    let called = false;
    const send = (async (url, options) => {
      called = true;
      assert.match(
        String(url),
        provider === 'anthropic' ? /v1\/messages$/ : /v1\/chat\/completions$/,
      );
      assert.equal(options?.redirect, 'error');
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model, 'test-model');
      assert.equal(body.messages.at(-1).content, 'ثبت‌نام');
      assert.equal(body.tools, undefined);
      return new Response(
        JSON.stringify(
          provider === 'anthropic'
            ? { content: [{ type: 'text', text: 'راهنمای مدل' }] }
            : { choices: [{ message: { content: 'راهنمای مدل' } }] },
        ),
      );
    }) as typeof fetch;
    assert.equal(
      (await assistantAnswer('ثبت‌نام', send)).answer,
      'راهنمای مدل',
    );
    assert.ok(called);
    const failure = await assistantAnswer(
      'ثبت‌نام',
      (async () =>
        new Response('private-key sensitive error', {
          status: 500,
        })) as typeof fetch,
    );
    assert.equal(failure.mode, 'fallback');
    assert.ok(!failure.answer.includes('private-key'));
    process.env.ASSISTANT_BASE_URL = 'http://provider.example';
    called = false;
    assert.equal((await assistantAnswer('ثبت‌نام', send)).mode, 'fallback');
    assert.equal(called, false);
    process.env.ASSISTANT_PROVIDER = 'local';
  });

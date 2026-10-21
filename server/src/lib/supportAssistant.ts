import { z } from 'zod';

export const guide = [
  {
    words: ['ثبت نام', 'ثبت‌نام', 'عضویت'],
    answer:
      'برای ثبت‌نام از ورود / ثبت‌نام شروع کنید، موبایل یا ایمیل را وارد و نقش خود را انتخاب کنید؛ سپس کد تأیید را وارد کنید.',
  },
  {
    words: ['رمز', 'ورود', 'لاگین'],
    answer:
      'در صفحهٔ ورود، شناسهٔ حساب را وارد کنید. برای بازیابی رمز از گزینهٔ فراموشی رمز استفاده کنید. رمز یا کد تأیید را برای هیچ‌کس ارسال نکنید.',
  },
  {
    words: ['کد', 'پیامک', 'ایمیل', 'otp'],
    answer:
      'درستی شماره یا ایمیل و پوشهٔ Spam را بررسی کنید. پس از پایان زمان انتظار، ارسال مجدد را بزنید؛ اگر مشکل ادامه داشت به پشتیبان پیام بدهید.',
  },
  {
    words: ['پرداخت', 'اشتراک', 'خرید', 'قیمت'],
    answer:
      'طرح‌ها را در بخش پکیج‌ها بررسی کنید. پس از پرداخت به سایت برگردید و وضعیت را ببینید. اگر مبلغ کسر شده ولی وضعیت در انتظار است، دوباره پرداخت نکنید و با پشتیبانی پیگیری کنید.',
  },
  {
    words: ['آزمون', 'امتحان', 'پاسخ', 'سوال', 'سؤال'],
    answer:
      'آزمون‌های مجاز در حساب شما نمایش داده می‌شوند. زمان و اتصال اینترنت را بررسی کنید و در پایان ثبت نهایی را بزنید. این راهنما به پاسخ صحیح آزمون‌ها دسترسی ندارد.',
  },
  {
    words: ['پشتیبان', 'انسان', 'تماس'],
    answer:
      'گزینهٔ «گفت‌وگو با پشتیبان» را انتخاب کنید. پس از ورود، پیام در حساب شما ذخیره می‌شود؛ پشتیبان از پنل سایت پاسخ می‌دهد. پاسخ فوری تضمین نمی‌شود.',
  },
];
const normalize = (s: string) =>
  s.toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ');
export function localAnswer(message: string) {
  return (
    guide.find((item) =>
      item.words.some((word) => normalize(message).includes(normalize(word))),
    )?.answer ??
    'من راهنمای رایگان داخلی سایت هستم و فعلاً به مدل هوش مصنوعی متصل نیستم. دربارهٔ ثبت‌نام، ورود، کد تأیید، اشتراک و آزمون می‌توانم راهنمایی کنم. برای موارد دیگر «گفت‌وگو با پشتیبان» را انتخاب کنید.'
  );
}
export const assistantInput = z
  .object({
    message: z.string().trim().min(1).max(2000),
    consent: z.boolean().optional(),
  })
  .strict();
export function assistantConfig() {
  const provider = z
    .enum(['local', 'openai-compatible', 'anthropic'])
    .parse(process.env.ASSISTANT_PROVIDER || 'local');
  return { provider, remote: provider !== 'local' };
}
export async function assistantAnswer(
  message: string,
  send: typeof fetch = fetch,
) {
  const { provider } = assistantConfig();
  if (provider === 'local')
    return { answer: localAnswer(message), mode: 'local' };
  try {
    const base = new URL(
      process.env.ASSISTANT_BASE_URL ||
        (provider === 'anthropic'
          ? 'https://api.anthropic.com/v1/'
          : 'https://api.openai.com/v1/'),
    );
    if (
      base.protocol !== 'https:' ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    )
      throw new Error('Invalid configuration');
    if (!base.pathname.endsWith('/')) base.pathname += '/';
    const key = process.env.ASSISTANT_API_KEY;
    const model = process.env.ASSISTANT_MODEL;
    if (!key || !model) throw new Error('Missing configuration');
    const system =
      'شما راهنمای فارسی این سامانه هستید. فقط بر پایهٔ راهنمای زیر پاسخ کوتاه بده؛ اطلاعات ناشناخته را حدس نزن و کاربر را به پشتیبان ارجاع بده. ابزار یا دسترسی به حساب، دیتابیس، پاسخ آزمون و پرداخت نداری. رمز، OTP یا اطلاعات بانکی نخواه.\n' +
      guide.map((x) => x.answer).join('\n');
    const anthropic = provider === 'anthropic';
    const response = await send(
      new URL(anthropic ? 'messages' : 'chat/completions', base),
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
        headers: {
          'Content-Type': 'application/json',
          ...(anthropic
            ? { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
            : { Authorization: `Bearer ${key}` }),
        },
        body: JSON.stringify(
          anthropic
            ? {
                model,
                max_tokens: 600,
                system,
                messages: [{ role: 'user', content: message }],
              }
            : {
                model,
                max_completion_tokens: 600,
                messages: [
                  { role: 'system', content: system },
                  { role: 'user', content: message },
                ],
              },
        ),
      },
    );
    if (!response.ok) throw new Error('Provider unavailable');
    const data = z
      .object({
        content: z
          .array(z.object({ type: z.string(), text: z.string().optional() }))
          .optional(),
        choices: z
          .array(
            z.object({ message: z.object({ content: z.string().nullable() }) }),
          )
          .optional(),
      })
      .parse(await response.json());
    const answer = anthropic
      ? data.content
          ?.filter((x: { type: string }) => x.type === 'text')
          .map((x) => x.text || '')
          .join('\n')
      : data.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim())
      throw new Error('Empty response');
    return { answer: answer.slice(0, 6000), mode: 'remote' };
  } catch {
    // Never expose or log provider responses, keys or users' messages.
    return {
      answer:
        'اتصال به مدل در دسترس نیست؛ پاسخ راهنمای داخلی: ' +
        localAnswer(message),
      mode: 'fallback',
    };
  }
}

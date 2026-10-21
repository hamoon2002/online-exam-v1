# استقرار تولیدی و بازیابی

این راهنما برای یک میزبان Linux با Docker Compose v2 و systemd است؛ چندمیزبانه/HA نیست. فایل `docker-compose.yml` ریشه همچنان مخصوص توسعه است. فایل تولیدی مستقل `deploy/compose.production.yml` است: فقط Nginx پورت ۸۰/۴۴۳ منتشر می‌کند؛ API، PostgreSQL و Redis پورت عمومی ندارند. MinIO در این پشته وجود ندارد؛ آپلودها به S3 مدیریت‌شده متصل می‌شوند.

## پیش‌نیازهای واقعی

- دامنه و DNS، گواهی معتبر TLS و تمدید خودکار آن در میزبان، فایروال، Docker، Python 3، age و AWS CLI v2 به‌روز.
- bucket اصلی در سرویس S3 با دسترسی محدود، bucket جداگانهٔ بک‌آپ، SMTP/Resend و پیامک واقعی، مرچنت پرداخت و گیرندهٔ HTTPS هشدار.
- محل ثابت کد `/opt/online-exam` و تنظیمات خصوصی `/etc/online-exam`؛ پوشهٔ تنظیمات root-owned باشد. کلید خصوصی TLS باید فقط برای root و گروه کاربر nginx داخل تصویر (GID 101) خواندنی باشد؛ سایر envها حالت `0600` داشته باشند. کل زنجیرهٔ مسیر TLS باید برای این گروه قابل پیمایش باشد.
- برای ظرفیت شروع: حداقل ۴ GiB حافظه، فضای کافی PostgreSQL و Docker؛ محدودیت‌های Compose و tmpfs ویدیو بر مبنای بار واقعی تنظیم شوند. tmpfs برنامه ۱ GiB است، پس بارگذاری هم‌زمان ویدیوهای بزرگ نیازمند اندازه‌گیری است.

## تنظیم و انتشار

1. فقط commit دارای CI موفق را انتخاب کنید. تصاویر API و وب را با **همان SHA** بسازید و در رجیستری خصوصی منتشر کنید؛ `latest` استفاده نکنید. برای ثبت غیرقابل‌تغییر واقعی می‌توان digest تصویر را در env گذاشت:

   ```bash
   docker build -t ghcr.io/OWNER/online-exam-api:SHA .
   docker build -f deploy/Web.Dockerfile -t ghcr.io/OWNER/online-exam-web:SHA .
   ```

   در صورت فعال‌سازی Google، هنگام ساخت وب `--build-arg VITE_GOOGLE_CLIENT_ID=...` بدهید؛ این شناسه عمومی است. هیچ secret دیگری وارد build args نشود. API وب روی `/api` و Socket.IO روی همان origin است.

2. از `deploy/production.env.example` و `deploy/server.production.env.example` به‌ترتیب `/etc/online-exam/compose.env` و `server.env` بسازید. برای هر رمز مستقل `openssl rand -hex 32` اجرا کنید. رمز PostgreSQL/Redis در دو فایل باید یکی باشد. این کار رمز volumeهای موجود را عوض نمی‌کند؛ برای مهاجرت دیتابیس موجود، rotation و انتقال داده جداگانه لازم است. `CLIENT_URL` فقط origin و `SERVER_URL` همان origin به‌همراه `/api` است. Nginx مسیر کوکی `/auth` را به `/api/auth` بازنویسی می‌کند.

3. `fullchain.pem` و `privkey.pem` در `TLS_DIR` قرار بگیرند. مسیر bind mount باید پوشه باشد تا تعویض فایل گواهی دیده شود؛ پس از هر تمدید `docker compose ... exec web nginx -s reload` اجرا و HTTPS کنترل شود. تمدید گواهی در این مخزن فعال نشده است. با افزودن CDN/پروکسی دیگر، trust و IP واقعی باید دوباره بررسی شود؛ تنظیم پیش‌فرض برای یک Nginx مستقیم است.

4. با shell خصوصی روی میزبان و بدون چاپ envها:

   ```bash
   cd /opt/online-exam
   dc() { docker compose --env-file /etc/online-exam/compose.env -f deploy/compose.production.yml "$@"; }
   dc config --quiet
   dc pull
   dc up -d --wait postgres redis
   dc run --rm migrate
   dc up -d --force-recreate --wait --wait-timeout 180 api web
   curl --fail https://YOUR-DOMAIN/api/health
   ```

   migration پیش از جایگزینی برنامه اجرا می‌شود؛ شکست آن باید انتشار را متوقف کند. روی دیتابیس موجود اول بک‌آپ قابل‌بازیابی بگیرید. برای rollback برنامه، هر دو image را به SHA قبلی برگردانید و `api web` را مجدد بسازید؛ بازسازی وب لازم است تا آدرس جدید API resolve شود. migration خودکار برعکس نمی‌شود؛ فقط migration سازگار با نسخهٔ قبلی مجاز است. این پشته جایگزین `deploy/staging.sh` نیست؛ staging قبلی network host و env دیگری دارد.

## S3 مدیریت‌شده

endpoint، region و path-style را از پنل ارائه‌دهنده بگیرید. برای داده‌های خصوصی bucket را public نکنید؛ برنامه لینک امضاشده می‌سازد. در صورت نیاز CMS، فقط prefix `public/` با policy محدود قابل‌خواندن عمومی باشد و `S3_PUBLIC_BASE_URL` به آدرس ریشهٔ همان bucket اشاره کند. CORS باید دامنهٔ واقعی وب و روش‌های لازم را پوشش دهد. اتصال آپلود/دانلود، expiry لینک خصوصی و رد درخواست بدون امضا را روی سرویس منتخب آزمایش کنید؛ سازگاری حساب واقعی آروان یا ارائه‌دهندهٔ دیگر در CI اثبات نمی‌شود.

## بک‌آپ خودکار و هشدار

`deploy/ops.py` خروجی `pg_dump` را مستقیم به age می‌دهد؛ dump خام روی دیسک نوشته نمی‌شود. فقط بعد از upload موفق به bucket جداگانه، زمان موفقیت ثبت می‌شود. فایل رمزگذاری‌شدهٔ موقت بعد از کار حذف می‌شود. کلید خصوصی age را **خارج از میزبان** نگه دارید؛ بدون آن بازیابی ممکن نیست. رمزگذاری جای کنترل دسترسی bucket را نمی‌گیرد.

1. روی دستگاه امن `age-keygen` اجرا و private key را در محل امن با نسخهٔ پشتیبان نگه دارید. فقط recipient عمومی را به میزبان بدهید.
2. `deploy/ops.env.example` را به `/etc/online-exam/ops.env` با حالت `0600` کپی و تکمیل کنید. مجوز کلید backup فقط upload به prefix بک‌آپ باشد؛ کلید بازیابی جداگانه نگه دارید. برای `aws s3 cp` بزرگ، مجوز multipart لازم است. versioning، retention/lifecycle (مثلاً ۳۵ روز) و در صورت پشتیبانی object lock را در ارائه‌دهنده تنظیم کنید. اطلاعات AWS داخل env می‌آید؛ home کاربر سرویس عمداً مسدود است.
3. فایل‌های `deploy/systemd/` را در `/etc/systemd/system/` نصب کنید. ابتدا بک‌آپ را دستی با `systemctl start online-exam-backup.service` اجرا و شیء واقعی bucket را تأیید کنید، سپس:

   ```bash
   systemctl daemon-reload
   systemctl enable --now online-exam-backup.timer online-exam-monitor.timer
   systemctl list-timers 'online-exam-*'
   ```

   قبل از اجرای نخستین service نیز `daemon-reload` لازم است. برنامهٔ بک‌آپ روزانه ساعت 02:30 UTC با تأخیر تصادفی حداکثر ۱۰ دقیقه است. تست سلامت هر ۵ دقیقه انجام می‌شود. خرابی API/TLS، بک‌آپ قدیمی‌تر از ۳۰ ساعت یا فضای کمتر از ۲ GiB هشدار می‌دهد؛ هشدار تکراری ساعتی و پیام بازیابی ارسال می‌شود. شکست ارسال هشدار موفق تلقی نمی‌شود. شکست backup نیز هشدار مستقل می‌دهد. گیرنده باید JSON با فیلد `text` بپذیرد.

4. یک monitor **خارج از همین سرور** برای HTTPS و heartbeat بک‌آپ/هشدار لازم است: خاموشی کامل میزبان یا قطع شبکه را timer همان میزبان نمی‌تواند گزارش کند. metrics از اینترنت توسط Nginx بسته است؛ Prometheus باید از شبکهٔ خصوصی با Bearer token scrape کند. Sentry فقط با DSN واقعی فعال می‌شود.

### تمرین بازیابی

بک‌آپ تا بازیابی آزمایشی معتبر نیست. روی محیط جداگانه و PostgreSQL 16، با کلید read-only بک‌آپ را دانلود کنید، دیتابیس **خالی و غیرتولیدی** بسازید و بدون ذخیرهٔ plaintext اجرا کنید:

```bash
age -d -i /secure/offline-identity backup.dump.age | pg_restore --exit-on-error --no-owner --no-acl --dbname="$RESTORE_DATABASE_URL"
```

schema و تعداد رکوردها، نمونهٔ آزمون/پرداخت و امکان ورود را بررسی کنید. CI همین مسیر dump/encrypt/decrypt/restore را با PostgreSQL واقعی تست می‌کند، ولی upload S3 در CI شبیه‌سازی است. بک‌آپ DB شامل فایل‌های S3 یا Redis نیست: برای فایل‌ها versioning/replication و تمرین بازیابی مستقل لازم است؛ از دست‌رفتن Redis می‌تواند نشست‌ها/OTPها را باطل کند. RPO این بک‌آپ حداکثر حدود ۲۴ ساعت و RTO وابسته به حجم و تمرین بازیابی است؛ برای نیاز سخت‌گیرانه‌تر PITR مدیریت‌شده لازم است.

## دروازهٔ پرداخت واقعی

موفقیت mock اثبات تراکنش واقعی نیست. پس از تأیید مرچنت و دامنه، با حساب آزمایشی و مبلغ مجاز درگاه یک پرداخت واقعیِ مجاز انجام دهید و شناسه/مبلغ/اشتراک را با پنل درگاه تطبیق دهید؛ لغو، callback تکراری و پرداخت pending را نیز بررسی کنید. گزارش refund برنامه انتقال وجه انجام نمی‌دهد. تست واقعی، ارسال OTP واقعی، دریافت هشدار، تمدید TLS و اتصال S3 تا زمان تنظیم حساب‌ها و میزبان تأیید نشده‌اند.

## وابستگی‌ها

sharp به 0.35.5 و Sentry به 10.76.2 به‌روز شده‌اند. ابزار قدیمی ts-node-dev با watch داخلی Node و ts-node جایگزین شده؛ `npm run dev -w server` همچنان ورودی توسعه است. CI از نصب تازه، audit با حد moderate، build، تست‌ها و smoke پشتهٔ تولیدی محافظت می‌کند. پاک‌بودن audit تضمین نبود همهٔ آسیب‌پذیری‌ها نیست.

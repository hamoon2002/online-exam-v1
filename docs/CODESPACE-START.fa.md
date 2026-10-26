# راهنمای راه‌اندازی پروژه در Codespace

این راهنما برای اجرای پروژه در `/workspaces/online-exam-v1` است: PostgreSQL، Redis و MinIO داخل Docker اجرا می‌شوند؛ سرور و کلاینت در دو ترمینال جدا.

## راه‌اندازی روزمره؛ هر بار Codespace را باز می‌کنید

### ترمینال اول: Docker، سرویس‌ها و سرور

```bash
cd /workspaces/online-exam-v1
bash scripts/start-codespace.sh
```

این اسکریپت سرویس‌های PostgreSQL، Redis و MinIO را روشن می‌کند، برای آماده‌شدن دیتابیس و Redis منتظر می‌ماند، اتصال Redis از سمت Node را بررسی می‌کند و سپس سرور را روی پورت 4000 اجرا می‌کند.

**این ترمینال را باز بگذارید.** برای اجرای دستور بعدی `Ctrl+C` نزنید؛ با این کار سرور متوقف می‌شود. هم‌زمان `npm run dev -w server` را در ترمینال دیگری اجرا نکنید، چون پورت 4000 اشغال می‌شود.

### ترمینال دوم: کلاینت

از منوی Terminal گزینهٔ New Terminal یا دکمهٔ `+` را بزنید:

```bash
cd /workspaces/online-exam-v1
npm run dev -w client
```

برای دیدن سایت، در تب **Ports** آدرس پورت **5173** را باز کنید. پورت 4000 مربوط به API است؛ صفحهٔ سایت روی آن نمایش داده نمی‌شود. کلاینت درخواست‌های API و Socket.IO را از طریق پروکسی Vite به سرور محلی پورت 4000 می‌فرستد؛ بنابراین مرورگر نیازی به اتصال مستقیم به پورت فورواردشدهٔ 4000 ندارد. در حالت development، تمدید نشست فقط origin دقیق Codespace فعال را قبول می‌کند.

### ترمینال سوم: بررسی سلامت، بدون متوقف‌کردن سرور

```bash
cd /workspaces/online-exam-v1

docker compose -p online-exam-v1 ps
docker compose -p online-exam-v1 exec -T redis sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping'
docker compose -p online-exam-v1 exec -T postgres pg_isready -U examuser -d examdb
node server/scripts/check-redis.cjs
curl -sS --max-time 10 -w '\nHTTP: %{http_code}\n' http://localhost:4000/health
```

نتیجهٔ مورد انتظار:

- Redis: `PONG`
- PostgreSQL: `accepting connections`
- بررسی Redis از Node: `Redis: PONG — ready`
- سلامت API: `{"status":"ok"}` و `HTTP: 200`

این متن‌ها **خروجی مورد انتظار** هستند، دستور ترمینال نیستند.

## اولین راه‌اندازی یا بعد از دریافت تغییرات

اگر پروژه قبلاً تنظیم شده، فایل‌های `.env` را دوباره کپی یا جایگزین نکنید. تنظیمات اولیه در [README](../README.md#توسعه-در-codespaces) آمده است.

بعد از دریافت تغییرات وابستگی‌ها:

```bash
cd /workspaces/online-exam-v1
node scripts/setup-local.cjs
node scripts/prepare-vendor.cjs
npm ci
```

برای آماده‌سازی سرویس‌ها و فضای ذخیرهٔ آپلودها:

```bash
docker compose -p online-exam-v1 up -d postgres redis minio minio-init
docker compose -p online-exam-v1 logs --tail=30 minio-init
```

`minio-init` یک کار یک‌باره برای ساخت bucket است؛ پایان یافتن آن با کد صفر طبیعی است. این دستور فایل‌های آپلودی قبلی را حذف نمی‌کند. اگر راه‌اندازی اولیهٔ فضای آپلود انجام نشده یا volume جدید ساخته‌اید، آن را اجرا کنید.

برای بررسی migrationها، پس از آماده‌شدن PostgreSQL:

```bash
cd /workspaces/online-exam-v1/server
npx prisma migrate status
```

اگر فقط migrationهای جدید و اجرا‌نشده وجود دارند و تاریخچه خطا ندارد:

```bash
npx prisma migrate deploy && npx prisma generate
```

سپس راه‌اندازی روزمره را انجام دهید. اگر migration شکست خورد یا پیام ناسازگاری تاریخچه آمد، همان خطا را بررسی کنید؛ `migrate reset` و حذف دیتابیس راه‌حل راه‌اندازی نیستند. `/health` موفق هم وجود تمام جدول‌ها و ستون‌های موردنیاز برنامه را تضمین نمی‌کند.

## خطاهای پرتکرار

### Redis unavailable / ECONNREFUSED / readiness timeout

در یک ترمینال جدا:

```bash
cd /workspaces/online-exam-v1
docker compose -p online-exam-v1 up -d postgres redis
docker compose -p online-exam-v1 ps
docker compose -p online-exam-v1 logs --tail=50 redis
```

ممکن است Redis بلافاصله بعد از `Started` هنوز آماده نباشد. برای اجرای سرور از اسکریپت روزمره استفاده کنید؛ خودش منتظر آماده‌شدن سرویس می‌ماند.

اگر داخل کانتینر `PONG` دارید ولی Node وصل نمی‌شود:

```bash
node server/scripts/check-redis.cjs
```

در این روش اجرای محلی، مقدار `REDIS_URL` در `server/.env` باید به Redis محلی اشاره کند:

```dotenv
REDIS_URL=redis://127.0.0.1:6379
```

این خط را در **فایل تنظیمات** بنویسید، نه به‌عنوان دستور Bash. برای Redis از URL فورواردشدهٔ HTTPS استفاده نکنید. اگر عمداً Redis خارجی دارید، تنظیمات همان سرویس را حفظ کنید. بعد از اصلاح تنظیمات، سرور را یک‌بار متوقف و دوباره با اسکریپت اجرا کنید.

### خطای Docker: RWLayer ... unexpectedly nil

ابتدا سرور را با `Ctrl+C` متوقف کنید و سپس:

```bash
cd /workspaces/online-exam-v1
docker compose -p online-exam-v1 up -d --force-recreate postgres redis minio
docker compose -p online-exam-v1 up -d --force-recreate minio-init
bash scripts/start-codespace.sh
```

با همین نام پروژه (`-p online-exam-v1`) و فایل compose، کانتینرها بازسازی و volumeهای نام‌دار قبلی دوباره استفاده می‌شوند. **`down -v`، `docker volume prune` یا حذف volumeها را اجرا نکنید؛ داده‌های دیتابیس و آپلودها داخل آن‌هاست.**

### Docker is not ready / cannot connect to Docker daemon

```bash
docker info
```

اگر Docker پاسخ نمی‌دهد، Codespace را از بخش Codespaces گیت‌هاب Stop و دوباره Start کنید؛ سپس دستور روزمره را اجرا کنید. روشن‌کردن کانتینرها به Docker آماده نیاز دارد.

### پورت 4000 اشغال است: EADDRINUSE

```bash
ss -lptn 'sport = :4000'
curl -sS --max-time 10 http://localhost:4000/health
```

احتمالاً سرور در ترمینال دیگری باز است. اگر سلامت آن OK است، سرور دوم لازم نیست. برای راه‌اندازی مجدد به ترمینال قبلی بروید، `Ctrl+C` بزنید و فقط یک نسخه را اجرا کنید. پردازش ناشناس را بدون بررسی متوقف نکنید.

### curl: Failed to connect to localhost port 4000

سرور روی آن پورت در دسترس نیست. ترمینال سرور را بررسی کنید؛ ممکن است با `Ctrl+C` متوقف شده یا به علت آماده‌نبودن Redis خارج شده باشد. راه‌اندازی روزمره را در ترمینال اول اجرا و آن را باز نگه دارید؛ curl را در ترمینال دیگری بزنید.

### MinIO: pull access denied

آدرس تصویرها در `docker-compose.yml` باید با مخزن فعلی پروژه هماهنگ باشد:

```yaml
image: quay.io/minio/minio:RELEASE.2024-04-18T19-09-19Z
# برای سرویس minio-init:
image: quay.io/minio/mc:RELEASE.2024-04-18T16-45-29Z
```

اگر فایل محلی هنوز `minio/minio:...` دارد، تغییر فایل compose را با نسخهٔ گیت‌هاب مقایسه کنید. خطای دریافت تصویر را با حذف داده‌ها یا volumeها حل نکنید.

## پایان کار

برای توقف برنامه‌ها، در ترمینال سرور و کلاینت `Ctrl+C` بزنید. اگر می‌خواهید سرویس‌های Docker هم متوقف شوند:

```bash
cd /workspaces/online-exam-v1
docker compose -p online-exam-v1 stop
```

این دستور کانتینرها و داده‌ها را حذف نمی‌کند. برای اجرای دفعهٔ بعد، همان دو دستور بخش «راه‌اندازی روزمره» کافی است.

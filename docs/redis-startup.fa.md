# راه‌اندازی Redis در Codespaces

این اصلاح بر مبنای commit `43ea82d4199f461d99fe170e58fee00e413d6b66` تهیه شده است.

## تغییرات

- اتصال اصلی و محدودکنندهٔ درخواست‌ها تنظیمات مشترک دارند؛ اتصال مجدد با فاصلهٔ افزایشی و سقف ۵ ثانیه انجام می‌شود.
- فرمان‌های جدید هنگام قطع ارتباط صف نمی‌شوند تا درخواست شکست‌خورده پس از بازیابی ناخواسته اجرا نشود.
- پیام قطعی در هر دوره یک بار و پیام بازیابی هنگام آماده‌شدن ثبت می‌شود. رمز و نام کاربری Redis در لاگ چاپ نمی‌شوند.
- سرور فقط پس از پاسخ PONG از هر دو اتصال Redis، پورت HTTP و کارهای زمان‌بندی‌شده را شروع می‌کند. مهلت راه‌اندازی ۱۵ ثانیه است؛ شکست، پردازش سرور را با کد ۱ متوقف می‌کند.
- health check هر دو اتصال Redis و دیتابیس را بررسی می‌کند؛ قطع هرکدام پاسخ ۵۰۳ می‌دهد.
- هیچ محدودیت امنیتی، rate limit یا کنترل نشست حذف نشده است.

## اجرا

از ریشه پروژه:

```bash
bash scripts/start-codespace.sh
```

اسکریپت PostgreSQL، Redis و MinIO را با Compose روشن می‌کند، آماده‌بودن PostgreSQL و Redis را می‌سنجد، سپس اتصال Redis را از خود Node با REDIS_URL واقعی بررسی می‌کند. بعد سرور را اجرا می‌کند؛ ترمینال را باز نگه دارید. فایل env تغییر نمی‌کند و هیچ volume یا دیتابیسی پاک نمی‌شود.

اگر خطای Docker از نوع RWLayer unexpectedly nil بود، اسکریپت متوقف می‌شود. فقط در این حالت:

```bash
docker compose -p online-exam-v1 up -d --force-recreate postgres redis minio
bash scripts/start-codespace.sh
```

برای تشخیص مستقل:

```bash
node server/scripts/check-redis.cjs
```

اگر Node مستقیماً در ترمینال Codespace اجرا می‌شود و Redis همین Compose روی پورت ۶۳۷۹ منتشر است، مقدار محلی معمول در `server/.env` این است:

```dotenv
REDIS_URL=redis://127.0.0.1:6379
```

آدرس HTTPS پورت فورواردشدهٔ GitHub آدرس Redis نیست. اگر Redis خارجی دارید، URL واقعی همان سرویس را نگه دارید. متغیر REDIS_URL صادرشده در شل بر server/.env اولویت دارد. PONG داخل کانتینر به‌تنهایی اتصال Node به URL تنظیم‌شده را ثابت نمی‌کند.

تایم‌اوت شبکه از روی لاگ به‌تنهایی علت قطعی مشخصی ندارد؛ Docker خاموش، پورت منتشرنشده، آدرس اشتباه یا سرویس خارجی غیرقابل دسترس با تغییر retry برطرف نمی‌شوند. خروجی check-redis برای تفکیک این وضعیت‌هاست.

## تست

```bash
node --test server/tests/redisConnection.test.cjs server/tests/redisRateLimit.test.cjs server/tests/sessionAccess.test.cjs
npm run build -w server
```

برای اجرای تست‌های اتصال واقعی، از یک Redis تستی استفاده کنید:

```bash
REQUIRE_SERVICES=1 REDIS_URL=redis://127.0.0.1:6379 node --test server/tests/redisConnection.test.cjs server/tests/redisRateLimit.test.cjs
```

تست اتصال مجدد فقط اتصال خودش را قطع می‌کند؛ تست‌ها از کلیدهای یکتا استفاده می‌کنند و FLUSHDB اجرا نمی‌کنند.

پس از اجرا، در ترمینال جداگانه:

```bash
curl -i --max-time 10 http://localhost:4000/health
```

پاسخ سالم health فقط دسترسی به وابستگی‌ها را تأیید می‌کند، نه تطابق ستون‌های دیتابیس. خطای قبلی ورود با وضعیت ۵۰۰ و پیام «خطای پایگاه داده» همچنان نیازمند کد خطای Prisma در لاگ است.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const outcome of ['success', 'failed', 'pending']) test(`subscription checkout and ${outcome} return`, async ({ page }) => {
  let checkoutCount = 0;
  const user = { id: 'teacher', role: 'Instructor', name: 'مدرس آزمایشی', username: 'teacher', approvalStatus: 'Approved', onboardingCompleted: true };
  await page.route('http://127.0.0.1:4109/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    if (path === '/auth/refresh') body = { accessToken: 'test-token' };
    if (path === '/auth/me') body = user;
    if (path === '/subscriptions/me') body = { instructorId: 'teacher', planId: 'free', startDate: '2026-01-01T00:00:00Z', endDate: null };
    if (path === '/subscriptions/usage') body = { groups: 0, activeExams: 0, questions: 0, handouts: 0 };
    if (path === '/subscriptions/checkout') {
      checkoutCount++;
      expect(route.request().postDataJSON()).toEqual({ planId: 'gold' });
      body = { free: false, paymentUrl: 'https://sandbox-gateway.example.test/pay' };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route('https://sandbox-gateway.example.test/pay', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<html lang="fa"><title>Test gateway</title><a href="http://127.0.0.1:5197/plans?payment=${outcome}">بازگشت به سایت</a></html>` }));
  await page.goto('/plans');
  await page.getByRole('button', { name: 'ارتقا', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  if (outcome === 'success') {
    const result = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(result.violations).toEqual([]);
  }
  await page.getByRole('button', { name: 'پرداخت و ادامه' }).click();
  await expect(page).toHaveURL('https://sandbox-gateway.example.test/pay');
  await page.getByRole('link', { name: 'بازگشت به سایت' }).click();
  const message = outcome === 'success' ? 'پرداخت با موفقیت انجام شد' : outcome === 'failed' ? 'پرداخت ناموفق بود یا لغو شد' : /نتیجه‌ی پرداخت هنوز تایید نشده/;
  await expect(page.getByText(message, { exact: typeof message === 'string' })).toBeVisible();
  expect(checkoutCount).toBe(1);
  await expect(page).toHaveURL(/\/plans$/);
});

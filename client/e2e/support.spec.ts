import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('mobile home guide is accessible and offers internal support login', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('http://127.0.0.1:4109/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = [];
    let status = 200;
    if (path.startsWith('/auth/')) {
      status = 401;
      body = {};
    }
    if (path === '/support/assistant')
      body =
        route.request().method() === 'POST'
          ? { answer: 'برای ثبت‌نام، کد تأیید را وارد کنید.', mode: 'local' }
          : { provider: 'local', remote: false };
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'راهنما و پشتیبانی' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'ثبت‌نام', exact: true }).click();
  await expect(
    page.getByText('برای ثبت‌نام، کد تأیید را وارد کنید.', { exact: true }),
  ).toBeVisible();
  const result = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole('button', { name: 'گفت‌وگو با پشتیبان' }).click();
  await expect(
    page.getByRole('link', { name: 'وارد حساب شوید' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'راهنما و پشتیبانی' }),
  ).toBeFocused();
});
for (const role of ['Student', 'SuperAdmin'])
  test(`${role} can send internal support message`, async ({ page }) => {
    const user = {
      id: 'support-user',
      role,
      name: 'کاربر پشتیبانی',
      username: 'support',
      approvalStatus: 'Approved',
      onboardingCompleted: true,
    };
    const messages: unknown[] = [];
    const thread = {
      id: 'thread',
      status: 'waiting',
      updatedAt: new Date().toISOString(),
      user: { name: 'کاربر پشتیبانی' },
    };
    await page.route('http://127.0.0.1:4109/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = [];
      if (path === '/auth/refresh') body = { accessToken: 'test-token' };
      if (path === '/auth/me') body = user;
      if (path === '/support/threads') body = [thread];
      if (path === '/support/mine') body = thread;
      if (path.endsWith('/messages')) {
        if (route.request().method() === 'POST') {
          const data = route.request().postDataJSON();
          messages.push({
            id: data.clientId,
            body: data.body,
            fromStaff: role === 'SuperAdmin',
            createdAt: new Date().toISOString(),
          });
          body = { id: 'thread' };
        } else body = messages;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });
    await page.goto('/support');
    if (role === 'SuperAdmin')
      await page.getByRole('button', { name: /کاربر پشتیبانی/ }).click();
    await page
      .getByRole('textbox', { name: /پیام به/ })
      .fill('سلام، لطفاً راهنمایی کنید.');
    await page.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
    await expect(page.getByRole('log')).toContainText(
      'سلام، لطفاً راهنمایی کنید.',
    );
    expect(messages).toHaveLength(1);
  });

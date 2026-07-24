import { expect, test } from '@playwright/test';

const login = async (page: import('@playwright/test').Page, email: string, password = '123456') => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
};

test('guest is redirected from a protected member route', async ({ page }) => {
  await page.goto('/app/bookings/new');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Đăng nhập BatterySwap' })).toBeVisible();
});

test('member login returns to the customer website', async ({ page }) => {
  await login(page, 'member@batteryswap.local');
  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await expect(page.getByText('Nguyen Tuan Anh')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Đặt lịch' })).toBeVisible();
});

test('member session survives reload and restores an expired access token', async ({ page }) => {
  await login(page, 'member@batteryswap.local');
  const refreshCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'refreshToken');
  expect(refreshCookie?.value).toBeTruthy();
  await page.evaluate(() => localStorage.setItem('token', 'expired-access-token'));

  const refreshResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/auth/refresh'));
  await page.reload();
  const refreshResponse = await refreshResponsePromise;
  const refreshPayload = await refreshResponse.json();

  expect(refreshResponse.status(), JSON.stringify(refreshPayload)).toBe(200);
  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await expect(page.getByText('Nguyen Tuan Anh')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).not.toBe('expired-access-token');
});

test('staff login shows only staff operations', async ({ page }) => {
  await login(page, 'staff@batteryswap.local');
  await expect(page).toHaveURL(/\/staff\/dashboard$/);
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Check-in khách hàng' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Người dùng' })).toHaveCount(0);
});

test('manager can see approval navigation', async ({ page }) => {
  await login(page, 'manager@batteryswap.local');
  await expect(page.getByRole('link', { name: 'Duyệt lịch thay pin' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Báo cáo vận hành' })).toBeVisible();
});

test('member cannot open a staff route', async ({ page }) => {
  await login(page, 'member@batteryswap.local');
  await page.goto('/staff/check-in');
  await expect(page).toHaveURL(/\/403$/);
  await expect(page.getByText('HTTP 403')).toBeVisible();
});

test('register and not-found pages are browser-visible', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Tạo tài khoản thành viên' })).toBeVisible();
  await page.goto('/missing-route');
  await expect(page).toHaveURL(/\/404$/);
  await expect(page.getByText('HTTP 404')).toBeVisible();
});

test('manager and admin login use one canonical dashboard each', async ({ page }) => {
  await login(page, 'manager@batteryswap.local');
  await expect(page).toHaveURL(/\/manager\/dashboard$/);
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, 'admin@batteryswap.local');
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
});

test('legacy member URLs redirect to canonical routes', async ({ page }) => {
  await login(page, 'member@batteryswap.local');
  await page.goto('/booking?vehicleId=legacy');
  await expect(page).toHaveURL(/\/app\/bookings\/new\?vehicleId=legacy$/);
  await page.goto('/history');
  await expect(page).toHaveURL(/\/app\/replacement-history$/);
});

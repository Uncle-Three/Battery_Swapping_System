import { expect, test, type Page } from '@playwright/test';

const login = async (page: Page, email: string, destination: RegExp) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('123456');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(destination);
};

test('admin menu lists and approves a real pending booking', async ({ page }) => {
  await login(page, 'member@batteryswap.local', /\/app\/dashboard$/);
  await page.goto('/app/bookings/new?vehicleId=6a54b42f1a755d82b5c480df&stationId=6a551f888ea51ca3f394577f');
  const available = page.getByRole('button').filter({ hasText: 'Còn trống' }).first();
  await expect(available).toBeVisible();
  await available.click();
  await page.getByRole('button', { name: 'Xem phí dịch vụ' }).click();
  await page.getByTestId('booking-quote').locator('button').first().click();
  await expect(page).toHaveURL(/\/app\/bookings\/[a-f0-9]{24}$/);
  const bookingId = page.url().split('/').at(-1)!;

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await login(page, 'admin@batteryswap.local', /\/admin\/dashboard$/);
  await page.getByRole('link', { name: 'Duyệt booking' }).click();
  await expect(page).toHaveURL(/\/admin\/booking-approvals$/);
  await expect(page.getByText('Hiển thị booking chờ duyệt của tất cả trạm trong hệ thống.')).toBeVisible();
  await page.locator(`a[href="/admin/booking-approvals/${bookingId}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/admin/booking-approvals/${bookingId}$`));
  await page.getByRole('button', { name: 'Xác nhận duyệt' }).click();
  await expect(page.getByRole('status')).toContainText('Đã duyệt booking thành công.');
});

import { expect, test } from '@playwright/test';

const login = async (page: import('@playwright/test').Page) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('member@batteryswap.local');
  await page.getByLabel('Mật khẩu').fill('123456');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

const openBookingForVehicle = async (page: import('@playwright/test').Page, safetyState: 'SAFE' | 'UNSAFE') => {
  const vehicleHref = await page.getByRole('link', { name: new RegExp(` ${safetyState}$`) }).first().getAttribute('href');
  expect(vehicleHref).toBeTruthy();
  await page.goto(`/app/bookings/new?vehicleId=${vehicleHref!.split('/').pop()}`);
};

test('station list and detail are visible from real API data', async ({ page }) => {
  await login(page);
  await page.goto('/app/stations');
  await expect(page.getByRole('heading', { name: 'Trạm thay pin' })).toBeVisible();
  const detail = page.getByRole('link', { name: 'Chi tiết' }).first();
  await detail.click();
  await expect(page).toHaveURL(/\/app\/stations\/[a-f0-9]{24}$/);
  await expect(page.getByRole('heading', { name: 'Tình trạng slot hiện tại' })).toBeVisible();
});

test('member creates and views a mandatory priority booking in the browser', async ({ page }) => {
  await login(page);
  await openBookingForVehicle(page, 'UNSAFE');
  await expect(page).toHaveURL(/\/app\/bookings\/new/);
  await expect(page.getByTestId('mandatory-booking')).toContainText('Mandatory battery replacement is required.');
  await page.getByRole('button', { name: 'Kiểm tra slot và pin tương thích' }).click();
  await expect(page.getByText('Đã tìm thấy pin SAFE tương thích')).toBeVisible();
  await page.getByRole('button', { name: 'Xem giá từ hệ thống' }).click();
  await expect(page.getByTestId('booking-quote')).toContainText('VND');
  await expect(page.getByTestId('booking-quote')).toContainText('Lịch thay pin bắt buộc');
  await page.getByRole('button', { name: 'Xác nhận và giữ chỗ' }).click();
  await expect(page).toHaveURL(/\/app\/bookings\/[a-f0-9]{24}$/);
  const createdId = page.url().split('/').pop()!;
  await expect(page.getByText('PENDING_APPROVAL', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Mandatory battery replacement is required.', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Quay lại danh sách' }).click();
  await expect(page.getByRole('heading', { name: 'Lịch thay pin của tôi' })).toBeVisible();
  await page.goto(`/app/bookings/${createdId}`);
  await page.getByRole('button', { name: 'Hủy lịch' }).click();
  await expect(page.getByText('CANCELLED', { exact: true }).first()).toBeVisible();
});

test('member creates a safe optional booking in the browser', async ({ page }) => {
  await login(page);
  await openBookingForVehicle(page, 'SAFE');
  
  await expect(page).toHaveURL(/\/app\/bookings\/new/);
  await expect(page.getByRole('heading', { name: 'Đặt lịch thay pin' })).toBeVisible();
  
  // Check slots
  await page.getByRole('button', { name: 'Kiểm tra slot và pin tương thích' }).click();
  await expect(page.getByText('Đã tìm thấy pin SAFE tương thích')).toBeVisible();
  
  // Get quote
  await page.getByRole('button', { name: 'Xem giá từ hệ thống' }).click();
  await expect(page.getByTestId('booking-quote')).toBeVisible();
  await expect(page.getByTestId('booking-quote')).not.toContainText('Lịch thay pin bắt buộc');
  
  // Confirm
  await page.getByRole('button', { name: 'Xác nhận và giữ chỗ' }).click();
  await expect(page).toHaveURL(/\/app\/bookings\/[a-f0-9]{24}$/);
  
  // Wait for booking page load
  await expect(page.getByText('PENDING_APPROVAL', { exact: true }).first()).toBeVisible();
  
  // Cancel cleanup
  await page.getByRole('button', { name: 'Hủy lịch' }).click();
  await expect(page.getByText('CANCELLED', { exact: true }).first()).toBeVisible();
});

test('member cannot open another booking id', async ({ page }) => {
  await login(page);
  await page.goto('/app/bookings/507f1f77bcf86cd799439011');
  await expect(page.getByRole('alert')).toContainText('Booking not found');
});

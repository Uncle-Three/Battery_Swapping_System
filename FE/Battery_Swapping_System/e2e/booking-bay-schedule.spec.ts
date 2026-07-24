import { expect, test } from '@playwright/test';

test('member selects a real replacement bay and 60-minute time window', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('member@batteryswap.local');
  await page.locator('input[type="password"]').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/app\/dashboard$/);

  await page.goto('/app/bookings/new?vehicleId=6a54b42f1a755d82b5c480df');
  await expect(page.getByRole('heading', { name: '2. Trạm & Thời gian' })).toBeVisible();
  await expect(page.getByRole('button').filter({ hasText: '60 phút' }).first()).toBeVisible();
  await expect(page.getByText(/Giờ mở cửa:/)).toBeVisible();
  const available = page.getByRole('button').filter({ hasText: 'Còn trống' }).first();
  await expect(available).toBeVisible();
  const bayCode = await available.locator('p').first().innerText();
  const timeRange = await available.locator('p').nth(2).innerText();
  await available.click();
  await expect(page.getByRole('heading', { name: 'Khung giờ đã chọn' })).toBeVisible();
  await page.getByRole('button', { name: 'Xem phí dịch vụ' }).click();
  await expect(page.getByTestId('booking-quote')).toBeVisible();
  await page.getByTestId('booking-quote').locator('button').first().click();
  await expect(page).toHaveURL(/\/app\/bookings\/[a-f0-9]{24}$/);

  await page.goto('/app/bookings/new?vehicleId=6a54b42f1a755d82b5c480df&stationId=6a551f888ea51ca3f394577f');
  const reserved = page.getByRole('button').filter({ hasText: bayCode }).filter({ hasText: timeRange });
  await expect(reserved).toContainText('Đã đầy');
  await expect(reserved).toBeDisabled();
});

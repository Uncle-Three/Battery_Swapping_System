import { expect, test, type Page } from '@playwright/test';

const stationId = '6a551f888ea51ca3f394577f';
const labels = ['Tổng quan','Khoang thay pin','Kho pin thay thế','Booking','Nhân sự & Phân công','Bảo trì & Sự cố','Báo cáo','Nhật ký hệ thống'];
const paths = ['overview','bays-slots','inventory','bookings','staff','maintenance','reports','audit-logs'];

const login = async (page: Page) => {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('admin@batteryswap.local');
  await page.locator('input[type="password"]').fill('123456');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
};

test('admin station detail has exactly eight persistent real-data tabs', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);
  await page.goto(`/admin/stations/${stationId}`);
  await expect(page).toHaveURL(new RegExp(`/admin/stations/${stationId}/overview$`));
  const stationNav = page.locator('nav').filter({ hasText: 'Khoang thay pin' });
  await expect(stationNav.getByRole('link')).toHaveCount(8);
  for (let index = 0; index < labels.length; index += 1) {
    await stationNav.getByRole('link', { name: labels[index] }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/stations/${stationId}/${paths[index]}$`));
  }

  await page.goto(`/admin/stations/${stationId}/bays-slots`);
  const suffix = String(Date.now()).slice(-7); const bayCode = `E${suffix}`; const bayName = `Khoang E2E ${suffix}`;
  await page.getByRole('button', { name: 'Tạo khoang' }).click();
  const bayDialog = page.getByRole('heading', { name: 'Tạo khoang thay pin' }).locator('../..');
  await bayDialog.getByPlaceholder('Mã khoang').fill(bayCode);
  await bayDialog.getByPlaceholder('Tên khoang').fill(bayName);
  await bayDialog.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText(bayName, { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText(bayName, { exact: true })).toBeVisible();

  await stationNav.getByRole('link', { name: 'Kho pin thay thế' }).click();
  await expect(page.getByRole('heading', { name: 'Kho pin thay thế' })).toBeVisible();
  await stationNav.getByRole('link', { name: 'Booking' }).click();
  await expect(page.getByRole('heading', { name: 'Booking' })).toBeVisible();

  await stationNav.getByRole('link', { name: 'Nhân sự & Phân công' }).click();
  await page.getByRole('button', { name: 'Phân công' }).click();
  const staffDialog = page.getByRole('heading', { name: 'Phân công nhân sự' }).locator('../..');
  const candidate = staffDialog.locator('select option').nth(1); const candidateValue = await candidate.getAttribute('value');
  expect(candidateValue).toBeTruthy();
  await staffDialog.locator('select').selectOption(candidateValue!);
  await staffDialog.locator('input').fill(`E2E-${suffix}`);
  await staffDialog.getByRole('button', { name: 'Lưu phân công' }).click();
  await expect(page.getByRole('status')).toContainText('Đã phân công');

  await stationNav.getByRole('link', { name: 'Bảo trì & Sự cố' }).click();
  await page.getByRole('button', { name: 'Tạo hồ sơ' }).click();
  const maintenanceDialog = page.getByRole('heading', { name: 'Tạo bảo trì hoặc sự cố' }).locator('../..');
  await maintenanceDialog.locator('input').nth(0).fill(`Kiểm tra E2E ${suffix}`);
  await maintenanceDialog.locator('textarea').fill('Kiểm tra luồng bảo trì chi tiết trạm');
  await maintenanceDialog.getByRole('button', { name: 'Lưu' }).click();
  await expect(page.getByText(`Kiểm tra E2E ${suffix}`, { exact: true })).toBeVisible();

  await stationNav.getByRole('link', { name: 'Nhật ký hệ thống' }).click();
  await expect(page.getByText('CREATE_STATION_MAINTENANCE', { exact: true }).first()).toBeVisible();
});

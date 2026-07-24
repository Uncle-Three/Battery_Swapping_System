import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const loginMember = async (page: import('@playwright/test').Page) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('member@batteryswap.local');
  await page.getByLabel('Mật khẩu').fill('123456');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

test.describe.serial('member dashboard and owned resources', () => {
let context: BrowserContext; let page: Page;
test.beforeAll(async ({ browser }) => { context = await browser.newContext(); page = await context.newPage(); await loginMember(page); });
test.afterAll(async () => { await context.close(); });

test('member dashboard displays real SAFE and UNSAFE vehicles', async () => {
  const safeVehicle = page.getByRole('link', { name: /VF8-INSTALLED-001 SAFE$/ });
  const unsafeVehicle = page.getByRole('link', { name: /VF8-INSTALLED-UNSAFE-001 UNSAFE$/ });

  await expect(safeVehicle).toBeVisible();
  await expect(unsafeVehicle).toBeVisible();
  await expect(safeVehicle).toContainText('VF8-INSTALLED-001');
  await expect(unsafeVehicle).toContainText('VF8-INSTALLED-UNSAFE-001');
});

test('member can browse owned vehicles and vehicle detail', async () => {
  await page.getByRole('link', { name: 'Xe của tôi' }).click();
  await expect(page).toHaveURL(/\/vehicles$/);
  const firstVehicleDetailLink = page.getByRole('link', { name: 'Xem chi tiết' }).first();
  await expect(firstVehicleDetailLink).toBeVisible();

  const firstVehicleRow = firstVehicleDetailLink.locator('../..');
  const vehicleList = firstVehicleRow.locator('..');
  const [rowBox, listBox] = await Promise.all([firstVehicleRow.boundingBox(), vehicleList.boundingBox()]);

  expect(rowBox).not.toBeNull();
  expect(listBox).not.toBeNull();
  expect(rowBox!.width / listBox!.width).toBeGreaterThan(0.9);

  await firstVehicleDetailLink.click();
  await expect(page).toHaveURL(/\/vehicles\/[a-f0-9]{24}$/);
  await expect(page.getByRole('heading', { name: 'Thông tin chung' })).toBeVisible();
});

test('add vehicle form requires a real battery ownership selection', async () => {
  await page.goto('/app/vehicles');
  await page.getByRole('button', { name: 'Thêm Xe' }).click();

  const dialogHeading = page.getByRole('heading', { name: 'Thêm Xe' });
  await expect(dialogHeading).toBeVisible();
  await expect(page.getByLabel('Hình thức sở hữu pin *')).toBeVisible();
  await dialogHeading.locator('..').getByRole('button').click();
  await expect(dialogHeading).toHaveCount(0);
});

test('battery health page shows measurements and configured thresholds', async () => {
  await page.getByRole('link', { name: 'Sức khỏe pin', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sức khỏe pin' })).toBeVisible();
  await expect(page.getByText('Ngưỡng an toàn — phiên bản 1')).toBeVisible();
  await expect(page.getByText('SOH an toàn tối thiểu: 80%')).toBeVisible();
  await page.getByRole('link', { name: 'Xem lịch sử đo' }).click();
  await expect(page.getByRole('heading', { name: 'Lịch sử sức khỏe pin' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '88%' }).first()).toBeVisible();
});

test('member cannot read an unowned or unknown vehicle through the UI', async () => {
  await page.evaluate(() => { window.history.pushState({}, '', '/app/vehicles/507f1f77bcf86cd799439011'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.getByRole('alert')).toContainText('Vehicle not found');
});
});

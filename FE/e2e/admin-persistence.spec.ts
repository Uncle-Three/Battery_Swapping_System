import { test, expect, type Page } from '@playwright/test';

const loginAsAdmin = async (page: Page) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@batteryswap.local');
  await page.getByLabel('Mật khẩu').fill('123456');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
};

test.describe('Admin persistence flows with the real API', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('admin can create and persist a station', async ({ page, request }) => {
    const stationName = `Trạm E2E ${Date.now()}`;
    let stationId = '';

    try {
      await page.goto('/admin/stations');
      await page.getByRole('button', { name: 'Thêm trạm sạc' }).click();
      await page.getByLabel('Tên trạm').fill(stationName);
      await page.getByLabel('Địa chỉ').fill('Quận 1, TP.HCM');
      await page.getByLabel('Vĩ độ (Lat)').fill('10.7769');
      await page.getByLabel('Kinh độ (Lng)').fill('106.7009');

      const createResponsePromise = page.waitForResponse((response) =>
        response.url().endsWith('/api/admin/stations') && response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Tạo mới' }).click();
      const createResponse = await createResponsePromise;
      expect(createResponse.ok()).toBeTruthy();
      const payload = await createResponse.json() as { data: { id: string } };
      stationId = payload.data.id;
      await expect(page.getByText(stationName, { exact: true })).toBeVisible();
    } finally {
      if (stationId) {
        const token = await page.evaluate(() => localStorage.getItem('token'));
        await request.delete(`http://127.0.0.1:5100/api/admin/stations/${stationId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      }
    }
  });
});

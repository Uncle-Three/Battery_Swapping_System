import { expect, test, type Page } from '@playwright/test';

const login = async (page: Page, email: string, destination: RegExp) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill('123456');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(destination);
};

test('admin assigns staff with a suggested station and staff can select a service bay', async ({ browser, request }) => {
  test.setTimeout(90_000);
  const adminContext = await browser.newContext(); const admin = await adminContext.newPage();
  const staffContext = await browser.newContext(); const staff = await staffContext.newPage();
  let assignmentId = ''; let wasActive = false; let adminToken = '';

  try {
    await login(admin, 'admin@batteryswap.local', /\/admin\/dashboard$/);
    adminToken = await admin.evaluate(() => localStorage.getItem('token') ?? '');
    const beforeResponse = await request.get('http://127.0.0.1:5100/api/admin/station-assignments', { headers: { Authorization: `Bearer ${adminToken}` } });
    const before = await beforeResponse.json() as { data: Array<{ id: string; active: boolean; user: { email: string }; station: { name: string } }> };
    const previous = before.data.find((item) => item.user.email === 'staff@batteryswap.local' && item.station.name === 'Trạm Egg');
    wasActive = previous?.active ?? false;

    await admin.goto('/admin/station-assignments');
    const staffUserId = await admin.getByLabel('Nhân sự').locator('option', { hasText: 'Staff Station' }).getAttribute('value');
    expect(staffUserId).toBeTruthy();
    await admin.getByLabel('Nhân sự').selectOption(staffUserId!);
    await expect(admin.getByText('Gợi ý phân công')).toBeVisible();
    await admin.getByRole('button', { name: 'Áp dụng gợi ý' }).click();
    await admin.getByLabel('Ca làm').selectOption('Ca chiều');
    const createResponsePromise = admin.waitForResponse((response) => response.url().endsWith('/api/admin/station-assignments') && response.request().method() === 'POST');
    await admin.getByRole('button', { name: 'Thêm phân công' }).click();
    const createResponse = await createResponsePromise; expect(createResponse.ok()).toBeTruthy();
    assignmentId = ((await createResponse.json()) as { data: { id: string } }).data.id;
    await expect(admin.getByText('Đã phân công nhân sự vào trạm và lưu trên hệ thống.')).toBeVisible();
    await admin.reload();
    const row = admin.getByRole('row').filter({ hasText: 'staff@batteryswap.local' }).filter({ hasText: 'Trạm Egg' });
    await expect(row).toContainText('Ca chiều'); await expect(row).toContainText('Đang hoạt động');

    await login(staff, 'staff@batteryswap.local', /\/staff\/dashboard$/);
    const contextResponsePromise = staff.waitForResponse((response) => response.url().endsWith('/api/staff/context') && response.request().method() === 'GET');
    await staff.goto('/staff/check-in');
    const contextResponse = await contextResponsePromise; expect(contextResponse.ok()).toBeTruthy();
    const contextPayload = await contextResponse.json() as { data: { stations: Array<{ name: string; serviceBays: Array<{ bookings: unknown[] }> }> } };
    const assignedStation = contextPayload.data.stations.find((item) => item.name === 'Trạm Egg');
    expect(assignedStation).toBeTruthy(); expect(assignedStation!.serviceBays).toHaveLength(4);
    expect(assignedStation!.serviceBays.every((bay) => Array.isArray(bay.bookings))).toBeTruthy();
    await expect(staff.getByRole('heading', { name: 'Chọn khoang có khách để thay pin' })).toBeVisible();
    await expect(staff.getByTestId('assigned-station')).toContainText('Trạm Egg');
    await expect(staff.getByTestId('assigned-station')).toContainText('Nhân viên không thể tự thay đổi');
    await expect(staff.getByRole('combobox', { name: 'Trạm được phân công' })).toHaveCount(0);
    await expect(staff.getByRole('heading', { name: 'Khoang đang có khách' })).toBeVisible();
  } finally {
    if (assignmentId && !wasActive && adminToken) await request.delete(`http://127.0.0.1:5100/api/admin/station-assignments/${assignmentId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
    await adminContext.close(); await staffContext.close();
  }
});

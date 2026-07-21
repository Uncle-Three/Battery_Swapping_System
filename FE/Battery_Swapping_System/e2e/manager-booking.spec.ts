import { expect, test } from '@playwright/test';

const login = async (page: import('@playwright/test').Page, email: string, destination: RegExp) => {
  await page.goto('/login'); await page.getByLabel('Email').fill(email); await page.getByLabel('Mật khẩu').fill('123456'); await page.getByRole('button', { name: 'Đăng nhập' }).click(); await expect(page).toHaveURL(destination);
};
const createMandatoryBooking = async (page: import('@playwright/test').Page) => {
  await page.goto('/app/dashboard');
  const vehicleHref = await page.getByRole('link', { name: / UNSAFE$/ }).first().getAttribute('href');
  expect(vehicleHref).toBeTruthy();
  await page.goto(`/app/bookings/new?vehicleId=${vehicleHref!.split('/').pop()}`);
  await page.getByRole('button', { name: 'Kiểm tra slot và pin tương thích' }).click();
  await expect(page.getByText('Đã tìm thấy pin SAFE tương thích')).toBeVisible();
  await page.getByRole('button', { name: 'Xem giá từ hệ thống' }).click();
  await page.getByRole('button', { name: 'Xác nhận và giữ chỗ' }).click();
  await expect(page).toHaveURL(/\/app\/bookings\/[a-f0-9]{24}$/);
  return page.url().split('/').pop()!;
};

test('manager can approve, reject and reschedule assigned-station bookings', async ({ browser }) => {
  test.setTimeout(120_000);
  const memberContext = await browser.newContext(); const managerContext = await browser.newContext();
  const memberPage = await memberContext.newPage(); const managerPage = await managerContext.newPage();
  await login(memberPage, 'member@batteryswap.local', /\/app\/dashboard$/); await login(managerPage, 'manager@batteryswap.local', /\/manager\/dashboard$/);
  const approvedId = await createMandatoryBooking(memberPage); await managerPage.goto(`/manager/bookings/${approvedId}`);
  await expect(managerPage.getByText('Bắt buộc · Ưu tiên 100')).toBeVisible(); await managerPage.getByRole('button', { name: 'Xác nhận duyệt' }).click();
  await expect(managerPage.getByRole('status')).toContainText('Đã duyệt'); await expect(managerPage.getByText('APPROVED', { exact: true }).first()).toBeVisible();
  await memberPage.goto(`/app/bookings/${approvedId}`); await memberPage.getByRole('button', { name: 'Hủy lịch' }).click(); await expect(memberPage.getByText('CANCELLED', { exact: true }).first()).toBeVisible();

  const rejectedId = await createMandatoryBooking(memberPage); await managerPage.goto(`/manager/bookings/${rejectedId}`);
  await managerPage.getByLabel('Lý do từ chối').fill('Trạm tạm thời không thể phục vụ'); await managerPage.getByRole('button', { name: 'Từ chối booking' }).click();
  await expect(managerPage.getByRole('status')).toContainText('Đã từ chối'); await expect(managerPage.getByText('REJECTED', { exact: true }).first()).toBeVisible();

  const rescheduledId = await createMandatoryBooking(memberPage); await managerPage.goto(`/manager/bookings/${rescheduledId}`);
  await managerPage.getByLabel('Lý do đổi lịch').fill('Đề xuất khung giờ phù hợp hơn'); await managerPage.getByRole('button', { name: 'Gửi đề xuất' }).click();
  await expect(managerPage.getByRole('status')).toContainText('Đã gửi đề xuất'); await expect(managerPage.getByText('RESCHEDULE_PROPOSED', { exact: true }).first()).toBeVisible();
  await memberContext.close(); await managerContext.close();
});

test('manager detail rejects unknown booking through a visible error', async ({ page }) => {
  await login(page, 'manager@batteryswap.local', /\/manager\/dashboard$/); await page.goto('/manager/bookings/507f1f77bcf86cd799439011'); await expect(page.getByRole('alert')).toContainText('Booking not found');
});

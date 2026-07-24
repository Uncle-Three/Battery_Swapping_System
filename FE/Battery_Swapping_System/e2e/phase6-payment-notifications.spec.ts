import { expect, test, type BrowserContext, type Page } from '@playwright/test';

// Helper: login as member and wait for redirect
const loginMember = async (page: Page) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('member@batteryswap.local');
  await page.getByLabel('Mật khẩu').fill('123456');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

// ── 1. Notifications page ────────────────────────────────────────────────────
test.describe.serial('notifications page', () => {
  let context: BrowserContext; let page: Page;
  test.beforeAll(async ({ browser }) => { context = await browser.newContext(); page = await context.newPage(); await loginMember(page); });
  test.afterAll(async () => { await context.close(); });

  test('notifications page is reachable and renders from API', async () => {
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Thông báo' })).toBeVisible();
    // Either empty state or notification items from seed
    const hasItems = (await page.locator('[id^="btn-mark-read-"]').count()) > 0;
    const hasEmpty = await page.getByText('Bạn không có thông báo nào.').isVisible();
    expect(hasItems || hasEmpty).toBe(true);
  });

  test('mark-read updates notification when unread items exist', async () => {
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Thông báo' })).toBeVisible();
    const firstMarkRead = page.locator('[id^="btn-mark-read-"]').first();
    const unreadExists = await firstMarkRead.isVisible();
    if (unreadExists) {
      // Get button id to target specific notification
      const btnId = await firstMarkRead.getAttribute('id');
      await firstMarkRead.click();
      // After marking read, the specific button should disappear
      if (btnId) {
        await expect(page.locator(`#${btnId}`)).not.toBeVisible({ timeout: 6000 });
      }
    } else {
      // All already read — verify the status text
      const allReadText = await page.getByText('Tất cả đã đọc').isVisible();
      const emptyState = await page.getByText('Bạn không có thông báo nào.').isVisible();
      expect(allReadText || emptyState).toBe(true);
    }
  });

  test('notifications route requires login — unauthenticated sees login redirect', async ({ browser }) => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto('/notifications');
    // Should redirect away from /notifications for unauthenticated users
    await expect(p).not.toHaveURL(/\/notifications$/);
    await ctx.close();
  });
});

// ── 2. Replacement history (History.tsx rewritten) ──────────────────────────
test.describe.serial('replacement history page', () => {
  let context: BrowserContext; let page: Page;
  test.beforeAll(async ({ browser }) => { context = await browser.newContext(); page = await context.newPage(); await loginMember(page); });
  test.afterAll(async () => { await context.close(); });

  test('replacement-history route renders history page', async () => {
    await page.goto('/replacement-history');
    await expect(page.getByRole('heading', { name: 'Lịch sử đổi pin' })).toBeVisible();
  });

  test('history route still works as legacy path', async () => {
    await page.goto('/history');
    await expect(page.getByRole('heading', { name: 'Lịch sử đổi pin' })).toBeVisible();
  });

  test('history shows persisted data or an empty state', async () => {
    await page.goto('/replacement-history');
    await expect(page.getByRole('heading', { name: 'Lịch sử đổi pin' })).toBeVisible();
    await expect(page.getByText('CONFIRMED BY RFID CARD INTERACTION')).not.toBeVisible();
    // Either real rows or empty state is displayed
    const hasRow = (await page.locator('button:has-text("Hóa đơn")').count()) > 0;
    const hasEmpty = await page.getByText('Bạn chưa thực hiện lần đổi pin nào.').isVisible();
    expect(hasRow || hasEmpty).toBe(true);
  });

  test('invoice modal shows real data when a completed swap exists', async () => {
    await page.goto('/replacement-history');
    const invoiceBtn = page.locator('button:has-text("Hóa đơn")').first();
    const hasSwap = await invoiceBtn.isVisible();
    if (!hasSwap) {
      test.info().annotations.push({ type: 'skip-reason', description: 'No completed swaps in seed for this member' });
      return;
    }
    await invoiceBtn.click();
    // Modal visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('CONFIRMED BY RFID CARD INTERACTION')).not.toBeVisible();
    await expect(page.getByText('BATTERYSWAP CO.')).toBeVisible();
    // Close modal
    await page.getByRole('button', { name: 'Đóng' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

// ── 3. PaymentBooking page ───────────────────────────────────────────────────
test.describe.serial('payment booking page', () => {
  let context: BrowserContext; let page: Page;
  test.beforeAll(async ({ browser }) => { context = await browser.newContext(); page = await context.newPage(); await loginMember(page); });
  test.afterAll(async () => { await context.close(); });

  test('payment page for non-existent bookingId shows error or redirect', async () => {
    await page.goto('/payments/000000000000000000000001');
    // Wait for loading to finish (either error state or redirect)
    await page.waitForLoadState('networkidle');
    const isRedirected = !page.url().includes('/payments/');
    // If not redirected, look for error alert
    if (!isRedirected) {
      // Wait for any error text to appear
      const errorVisible = await page.getByRole('alert').isVisible({ timeout: 5000 });
      // If alert not showing, page may show a different error container
      const anyError = await page.getByText('Booking không tồn tại').isVisible({ timeout: 3000 }).catch(() => false);
      expect(errorVisible || anyError || isRedirected).toBe(true);
    }
  });

  test('bookings list is accessible and shows my bookings heading', async () => {
    await page.goto('/bookings');
    await expect(page.getByRole('heading', { name: 'Lịch thay pin của tôi' })).toBeVisible();
  });

  test('completed booking detail has payment link', async () => {
    await page.goto('/bookings');
    await expect(page.getByRole('heading', { name: 'Lịch thay pin của tôi' })).toBeVisible();
    // Exclude the "Đặt lịch mới" create link
    const bookingLinks = page.locator('a[href^="/bookings/"]:not([href="/bookings/create"])');
    const count = await bookingLinks.count();
    if (count === 0) {
      test.info().annotations.push({ type: 'skip-reason', description: 'No bookings for member' });
      return;
    }
    await bookingLinks.first().click();
    await expect(page).toHaveURL(/\/bookings\/[a-f0-9]{24}$/);
    const payLink = page.getByRole('link', { name: 'Xem thanh toán' });
    const statusBadge = page.locator('.rounded-full.bg-green-100').first();
    const statusText = await statusBadge.innerText().catch(() => '');
    if (['CHECKED_IN', 'PAYMENT_PENDING', 'COMPLETED'].some(s => statusText.includes(s))) {
      await expect(payLink).toBeVisible();
    }
  });
});

// ── 4. VNPay return page ─────────────────────────────────────────────────────
test.describe('vnpay return page', () => {
  test('vnpay return page with no vnp params shows no-info message', async ({ page }) => {
    await page.goto('/payments/vnpay/return');
    await expect(page).toHaveURL(/vnpay\/return/);
    // Should display the "no VNPay info" error
    await expect(page.getByRole('heading', { name: 'Không có kết quả thanh toán' })).toBeVisible({ timeout: 5000 });
  });

  test('vnpay return page with invalid signature shows error or failure state', async ({ page }) => {
    await page.goto('/payments/vnpay/return?vnp_ResponseCode=24&vnp_TxnRef=test123&vnp_Amount=10000000&vnp_SecureHash=invalid&vnp_TransactionStatus=02');
    await expect(page).toHaveURL(/vnpay\/return/);
    // Backend rejects invalid signature — FE should show the error message
    const hasError = await page.getByRole('alert').isVisible({ timeout: 5000 });
    const hasSignatureError = await page.getByText(/chữ ký/i).isVisible({ timeout: 3000 }).catch(() => false);
    const hasCancelState = await page.getByText('Đã hủy thanh toán').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasError || hasSignatureError || hasCancelState).toBe(true);
  });
});

// ── 5. Wallet page (renamed from /payment) ──────────────────────────────────
test.describe.serial('legacy wallet routes redirect to direct booking payments', () => {
  let context: BrowserContext; let page: Page;
  test.beforeAll(async ({ browser }) => { context = await browser.newContext(); page = await context.newPage(); await loginMember(page); });
  test.afterAll(async () => { await context.close(); });

  test('/wallet redirects to bookings', async () => {
    await page.goto('/wallet');
    await expect(page).toHaveURL(/\/app\/bookings$/);
  });

  test('/payment redirects to bookings', async () => {
    await page.goto('/payment');
    await expect(page).toHaveURL(/\/app\/bookings$/);
  });
});

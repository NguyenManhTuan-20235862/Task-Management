import { expect, test } from "@playwright/test";

// Tài khoản từ prisma/seed.ts — chạy `npm run db:seed` trước khi test
const ADMIN = { email: "admin@congty.com.vn", password: "Admin@12345" };
const DEV = { email: "duc.dev@congty.com.vn", password: "Matkhau@123" };

async function login(
  page: import("@playwright/test").Page,
  account: { email: string; password: string },
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

test.describe("Luồng đăng nhập", () => {
  test("chưa đăng nhập thì bị đẩy về /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Đăng nhập" }),
    ).toBeVisible();
  });

  test("form báo lỗi khi bỏ trống", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByText("Vui lòng nhập email")).toBeVisible();
    await expect(page.getByText("Vui lòng nhập mật khẩu")).toBeVisible();
  });

  test("sai mật khẩu thì báo lỗi chung, không lộ email tồn tại", async ({
    page,
  }) => {
    await login(page, { email: ADMIN.email, password: "sai-mat-khau" });
    await expect(
      page.getByText("Email hoặc mật khẩu không đúng"),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("đăng nhập đúng thì vào trang chủ, thấy đúng vai trò", async ({
    page,
  }) => {
    await login(page, ADMIN);
    await expect(page).toHaveURL("/");
    // exact: tên admin trong h1 là "Xin chào, Quản trị viên" nên không khớp exact
    await expect(page.getByText("Quản trị viên", { exact: true })).toBeVisible();
  });

  test("Dev đăng nhập thấy vai trò Lập trình viên", async ({ page }) => {
    await login(page, DEV);
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Lập trình viên")).toBeVisible();
  });

  test("đã đăng nhập thì /login tự chuyển về trang chủ", async ({ page }) => {
    await login(page, ADMIN);
    await expect(page).toHaveURL("/");
    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });

  test("đăng xuất xong quay về /login và mất phiên", async ({ page }) => {
    await login(page, ADMIN);
    await expect(page).toHaveURL("/");
    await page.getByRole("button", { name: "Đăng xuất" }).click();
    await expect(page).toHaveURL(/\/login/);
    // Phiên đã huỷ: vào lại / phải bị đẩy về /login
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });
});

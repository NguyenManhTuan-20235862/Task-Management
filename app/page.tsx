import type { Role } from "@prisma/client";

import { LogoutButton } from "@/components/auth/logout-button";
import { auth } from "@/lib/auth";

const roleLabels: Record<Role, string> = {
  ADMIN: "Quản trị viên",
  PM: "Quản lý dự án",
  DEV: "Lập trình viên",
};

// Trang chủ tạm — sẽ thay bằng điều hướng theo role (dashboard PM, my-tasks Dev)
// khi làm bước 3-7 trong CLAUDE.md §9. Proxy đã đảm bảo chỉ user đã login vào được đây.
export default async function HomePage() {
  const session = await auth();
  const user = session?.user;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
            T
          </span>
          <span className="text-sm font-medium">Task Management</span>
        </div>
        <LogoutButton />
      </header>

      <section className="mt-16 grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Xin chào, {user?.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Bạn đang đăng nhập với vai trò{" "}
          <span className="font-medium text-foreground">
            {user ? roleLabels[user.role] : ""}
          </span>
          . Các màn hình quản lý project và task sẽ xuất hiện ở đây.
        </p>
      </section>
    </main>
  );
}

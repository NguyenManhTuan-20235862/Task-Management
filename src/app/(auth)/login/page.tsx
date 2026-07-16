import type { Metadata } from "next";
import { CalendarClock, FolderKanban, MessageSquare } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập | Task Management",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-[100dvh] flex-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Panel thương hiệu: cố định tông tối ở cả 2 chế độ sáng/tối */}
      <section
        aria-hidden
        className="relative hidden flex-col justify-between overflow-hidden bg-zinc-950 p-10 text-zinc-50 lg:flex"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 60% at 20% 100%, oklch(0.35 0 0 / 0.6) 0%, transparent 70%)",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-50 text-sm font-semibold text-zinc-950">
            T
          </span>
          <span className="text-sm font-medium">Task Management</span>
        </div>
        <div className="relative grid max-w-md gap-8">
          <p className="text-3xl font-medium tracking-tight text-balance">
            Một nơi cho mọi dự án, task và tiến độ của team.
          </p>
          <ul className="grid gap-4 text-sm text-zinc-400">
            <li className="flex items-center gap-3">
              <FolderKanban className="size-4 shrink-0 text-zinc-500" />
              Admin tạo project, PM giao task cho đúng người
            </li>
            <li className="flex items-center gap-3">
              <CalendarClock className="size-4 shrink-0 text-zinc-500" />
              Ngày bắt đầu, hạn chót và tiến độ % của từng task
            </li>
            <li className="flex items-center gap-3">
              <MessageSquare className="size-4 shrink-0 text-zinc-500" />
              Trao đổi bằng comment, đính kèm file và hình ảnh
            </li>
          </ul>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 grid gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập</h1>
            <p className="text-sm text-muted-foreground">
              Dùng tài khoản do quản trị viên cấp.
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}

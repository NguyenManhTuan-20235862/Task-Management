import { Bell, LayoutGrid, Search } from "lucide-react";
import type { Role } from "@prisma/client";

import { SidebarNav } from "@/components/app/sidebar-nav";
import { LogoutButton } from "@/components/auth/logout-button";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/user/user-avatar";
import { auth } from "@/lib/auth";

const roleLabels: Record<Role, string> = {
  ADMIN: "Quản trị viên",
  PM: "Quản lý dự án",
  DEV: "Lập trình viên",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="gap-3 px-3 py-4">
          <div className="flex items-center gap-2.5 px-1">
            <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
              T
            </span>
            <div className="grid gap-0 leading-none">
              <span className="text-sm font-medium text-sidebar-foreground">
                Task Management
              </span>
              <span className="text-xs text-sidebar-foreground/60">
                Nội bộ
              </span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          {user && <SidebarNav role={user.role} />}
        </SidebarContent>
        <SidebarFooter className="gap-2 px-3 py-3">
          {user && (
            <div className="flex items-center gap-2 rounded-lg px-1 py-1.5">
              <UserAvatar name={user.name ?? user.email ?? "?"} size="sm" />
              <div className="grid min-w-0 flex-1 gap-0 leading-none">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {user.name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {roleLabels[user.role]}
                </p>
              </div>
              <LogoutButton />
            </div>
          )}
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
          <div className="flex flex-1 items-center gap-3">
            <LayoutGrid
              className="size-4 shrink-0 text-muted-foreground md:hidden"
              aria-hidden
            />
            <div className="relative w-full max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                placeholder="Tìm dự án, thành viên..."
                className="pl-8"
                aria-label="Tìm kiếm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Thông báo"
              className="relative flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="size-4" aria-hidden />
            </button>
            {user && <UserAvatar name={user.name ?? user.email ?? "?"} size="sm" />}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

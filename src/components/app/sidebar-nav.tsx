"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  Activity,
  FolderKanban,
  LayoutGrid,
  ListChecks,
  Settings,
  Users,
} from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Route/nav khác nhau theo role: Admin xem toàn hệ thống tại "/", PM có dashboard
// project mình quản lý tại "/", Dev có "Việc của tôi" — task được giao cho
// chính mình tại "/" (CLAUDE.md §4 "my-tasks").
export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();

  const items =
    role === "ADMIN"
      ? [
          { href: "/", label: "Tổng quan", icon: LayoutGrid },
          { href: "/projects", label: "Dự án", icon: FolderKanban },
          { href: "/members", label: "Thành viên", icon: Users },
          { href: "/activity", label: "Hoạt động", icon: Activity },
        ]
      : role === "PM"
        ? [
            { href: "/", label: "Tổng quan", icon: LayoutGrid },
            { href: "/projects", label: "Dự án", icon: FolderKanban },
          ]
        : [
            { href: "/", label: "Việc của tôi", icon: ListChecks },
            { href: "/projects", label: "Dự án", icon: FolderKanban },
          ];

  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            isActive={pathname === item.href}
            render={<Link href={item.href} />}
          >
            <item.icon />
            <span>{item.label}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}

      {role === "ADMIN" && (
        <SidebarMenuItem>
          <SidebarMenuButton disabled className="opacity-50">
            <Settings />
            <span>Cài đặt</span>
          </SidebarMenuButton>
          <SidebarMenuBadge>Sắp có</SidebarMenuBadge>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  );
}

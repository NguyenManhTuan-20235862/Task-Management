import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { BarChart3, CheckSquare, Shield } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { CreateMemberDialog } from "@/components/member/create-member-dialog";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user/user-avatar";
import { ForbiddenError, requireRole, requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";

const roleLabels = { ADMIN: "Admin", PM: "PM", DEV: "Dev" } as const;
const roleDescriptions = {
  ADMIN: "Quản trị toàn bộ",
  PM: "Quản lý dự án",
  DEV: "Lập trình viên",
} as const;

export default async function MembersPage() {
  const { user } = await requireUser();
  try {
    // Quản lý thành viên là góc nhìn toàn hệ thống, chỉ Admin xem — không nằm
    // trong "Xem project" theo membership của PM/Dev (CLAUDE.md §2).
    requireRole(user, ["ADMIN"]);
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const [members, adminCount, pmCount, devCount] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { role: "PM" } }),
    db.user.count({ where: { role: "DEV" } }),
  ]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Quản lý thành viên
          </h1>
          <p className="text-sm text-muted-foreground">{members.length} người</p>
        </div>
        <CreateMemberDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Shield}
          value={String(adminCount)}
          label="Admin"
          sublabel="Quản trị hệ thống"
          tone="neutral"
        />
        <StatCard
          icon={BarChart3}
          value={String(pmCount)}
          label="PM"
          sublabel="Quản lý dự án"
          tone="primary"
        />
        <StatCard
          icon={CheckSquare}
          value={String(devCount)}
          label="Dev"
          sublabel="Lập trình viên"
          tone="emerald"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Thành viên</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Vai trò</th>
              <th className="px-4 py-2.5 font-medium">Dự án</th>
              <th className="px-4 py-2.5 font-medium">Ngày tham gia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.map((member) => (
              <tr key={member.id} className={member.role !== "ADMIN" ? "hover:bg-muted/40" : undefined}>
                <td className="px-4 py-3">
                  {member.role === "ADMIN" ? (
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={member.name} size="sm" />
                      <div className="grid gap-0">
                        <span className="font-medium">{member.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {roleDescriptions[member.role]}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/members/${member.id}`}
                      className="flex items-center gap-2.5"
                    >
                      <UserAvatar name={member.name} size="sm" />
                      <div className="grid gap-0">
                        <span className="font-medium hover:underline underline-offset-4">
                          {member.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {roleDescriptions[member.role]}
                        </span>
                      </div>
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{roleLabels[member.role]}</Badge>
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {member.role === "ADMIN" ? "Tất cả" : member._count.memberships}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {format(member.createdAt, "dd/MM/yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

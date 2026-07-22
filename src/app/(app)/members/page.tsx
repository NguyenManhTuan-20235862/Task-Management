import { notFound } from "next/navigation";
import { BarChart3, CheckSquare, Shield } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { CreateMemberDialog } from "@/components/member/create-member-dialog";
import { MembersBrowser } from "@/components/member/members-browser";
import { ForbiddenError, requireRole, requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";

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

      <MembersBrowser
        members={members.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          createdAt: member.createdAt,
          memberCount: member._count.memberships,
        }))}
      />
    </div>
  );
}

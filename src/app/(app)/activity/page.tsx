import { notFound } from "next/navigation";

import { ActivityBrowser } from "@/components/dashboard/activity-browser";
import { ForbiddenError, requireRole, requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";

const ACTIVITY_LIMIT = 30;

export default async function ActivityPage() {
  const { user } = await requireUser();
  try {
    // Nhật ký toàn hệ thống — chỉ Admin xem (cùng nguyên tắc với /members).
    requireRole(user, ["ADMIN"]);
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const activities = await db.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_LIMIT,
    select: {
      id: true,
      type: true,
      message: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hoạt động</h1>
        <p className="text-sm text-muted-foreground">
          Nhật ký các thao tác quan trọng trong hệ thống
        </p>
      </div>

      {activities.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Chưa có hoạt động nào được ghi nhận.
          </p>
        </div>
      ) : (
        <ActivityBrowser activities={activities} />
      )}
    </div>
  );
}

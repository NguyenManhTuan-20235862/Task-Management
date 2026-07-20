import { notFound } from "next/navigation";
import { format } from "date-fns";

import { ActivityTypeBadge } from "@/components/dashboard/activity-type-badge";
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
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Thời gian</th>
                <th className="px-4 py-2.5 font-medium">Người thực hiện</th>
                <th className="px-4 py-2.5 font-medium">Loại</th>
                <th className="px-4 py-2.5 font-medium">Nội dung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap text-muted-foreground">
                    {format(activity.createdAt, "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {activity.actor.name}
                  </td>
                  <td className="px-4 py-3">
                    <ActivityTypeBadge type={activity.type} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {activity.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { format } from "date-fns";

import { cn } from "@/lib/utils";

export type ProjectActivityItem = {
  id: string;
  actorName: string;
  message: string;
  createdAt: Date;
};

export function ProjectActivityFeed({
  activities,
  className,
}: {
  activities: ProjectActivityItem[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 rounded-xl border border-border p-4", className)}>
      <h2 className="text-sm font-medium">Hoạt động gần đây</h2>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có hoạt động nào được ghi nhận.
        </p>
      ) : (
        // Chỉ khoảng 3 dòng lọt trong max-h-56 — quá số đó phải cuộn, tránh
        // box hoạt động kéo dài chiếm hết chiều cao trang.
        <div className="grid max-h-56 gap-4 overflow-y-auto pr-1">
          {activities.map((activity, i) => (
            <div
              key={activity.id}
              className={cn("grid gap-1", i > 0 && "border-t border-border pt-4")}
            >
              <p className="text-sm">
                <span className="font-medium">{activity.actorName}</span>{" "}
                <span className="text-muted-foreground">{activity.message}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {format(activity.createdAt, "dd/MM/yyyy HH:mm")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

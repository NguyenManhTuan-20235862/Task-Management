import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";

import { StatusBadge } from "@/components/task/status-badge";
import { TaskProgress } from "@/components/task/task-progress";
import { UserAvatar } from "@/components/user/user-avatar";
import type { ProjectSummary } from "@/lib/queries/project-summary";
import { cn } from "@/lib/utils";

// Màu icon chỉ để phân biệt trực quan giữa các card (không mang ý nghĩa trạng thái) —
// khác với StatusBadge/TaskProgress vốn dùng màu có ngữ nghĩa cố định.
const iconTones = [
  "bg-[oklch(0.92_0.05_25)] text-[oklch(0.45_0.12_25)] dark:bg-[oklch(0.35_0.08_25/0.4)] dark:text-[oklch(0.85_0.08_25)]",
  "bg-primary/10 text-primary",
  "bg-[oklch(0.93_0.04_290)] text-[oklch(0.45_0.12_290)] dark:bg-[oklch(0.35_0.08_290/0.4)] dark:text-[oklch(0.85_0.08_290)]",
  "bg-muted text-muted-foreground",
];

export function ProjectCard({
  project,
  memberCount,
  tone,
}: {
  project: ProjectSummary;
  memberCount: number;
  tone: number;
}) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="grid gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            iconTones[tone % iconTones.length],
          )}
        >
          <CalendarDays className="size-4.5" aria-hidden />
        </span>
        <div className="grid min-w-0 gap-0.5">
          <p className="truncate text-sm font-medium">{project.name}</p>
          <p className="text-xs text-muted-foreground">
            {memberCount} thành viên
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Tiến độ</span>
          <span className="font-medium text-foreground">
            {project.avgProgress}%
          </span>
        </div>
        <TaskProgress value={project.avgProgress} showValue={false} />
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[oklch(0.5_0.15_155)] dark:text-[oklch(0.75_0.15_155)]">
            {project.doneCount} Xong
          </span>
          <span className="text-primary">{project.inProgressCount} Đang làm</span>
          <span className="text-muted-foreground">{project.todoCount} Chờ</span>
        </div>
        <span className="text-muted-foreground">
          Tổng: <span className="font-medium text-foreground">{project.taskCount}</span>
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        {project.pmName ? (
          <div className="flex items-center gap-1.5">
            <UserAvatar name={project.pmName} size="sm" />
            <span>{project.pmName}</span>
          </div>
        ) : (
          <span>Chưa có PM</span>
        )}
        {project.latestDue && (
          <span>{format(project.latestDue, "dd/MM/yyyy")}</span>
        )}
        <StatusBadge status={project.status} />
      </div>
    </Link>
  );
}

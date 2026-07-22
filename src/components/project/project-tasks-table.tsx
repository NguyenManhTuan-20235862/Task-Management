"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import type { TaskStatus } from "@prisma/client";

import { StatusBadge } from "@/components/task/status-badge";
import { TaskDialog } from "@/components/task/task-dialog";
import { TaskProgress } from "@/components/task/task-progress";
import { UserAvatar } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";

export type ProjectTaskRow = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  progress: number;
  startDate: Date;
  dueDate: Date;
  assigneeId: string;
  assigneeName: string;
};

// Chỉ 2 tab (không có "Tất cả") — "Đang thực hiện" gộp cả TODO lẫn IN_PROGRESS
// để không có task nào biến mất khỏi cả 2 tab (TaskStatus có 3 giá trị).
const FILTERS = [
  { value: "ACTIVE", label: "Đang thực hiện" },
  { value: "DONE", label: "Hoàn thành" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

export function ProjectTasksTable({
  tasks,
  isManagingPm,
  assigneeOptions,
  devWorkload,
  emptyMessage = "Project chưa có task nào.",
}: {
  tasks: ProjectTaskRow[];
  isManagingPm: boolean;
  assigneeOptions: { id: string; name: string }[];
  devWorkload: Record<string, number>;
  emptyMessage?: string;
}) {
  const [filter, setFilter] = useState<FilterValue>("ACTIVE");

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const filtered = tasks.filter((t) =>
    filter === "DONE" ? t.status === "DONE" : t.status !== "DONE",
  );

  return (
    <div className="grid gap-4">
      <div className="flex w-fit items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Không có task nào ở trạng thái này.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Task</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">
                  Người thực hiện
                </th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Tiến độ</th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="px-4 py-2.5 font-medium whitespace-nowrap">Hạn</th>
                {isManagingPm && <th className="px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((task) => (
                <tr key={task.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="hover:underline underline-offset-4"
                    >
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={task.assigneeName} size="sm" />
                      <span className="text-muted-foreground">
                        {task.assigneeName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TaskProgress value={task.progress} className="w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {format(task.dueDate, "dd/MM/yyyy")}
                  </td>
                  {isManagingPm && (
                    <td className="px-4 py-3">
                      <TaskDialog
                        mode="edit"
                        taskId={task.id}
                        devOptions={assigneeOptions}
                        devWorkload={devWorkload}
                        initialValues={{
                          title: task.title,
                          description: task.description,
                          assigneeId: task.assigneeId,
                          startDate: task.startDate.toISOString().slice(0, 10),
                          dueDate: task.dueDate.toISOString().slice(0, 10),
                        }}
                        trigger={
                          <button
                            type="button"
                            aria-label={`Sửa task ${task.title}`}
                            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </button>
                        }
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import type { TaskStatus } from "@prisma/client";
import { CheckSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/task/status-badge";
import { TaskProgress } from "@/components/task/task-progress";
import { cn } from "@/lib/utils";

export type MyTask = {
  id: string;
  title: string;
  projectName: string;
  status: TaskStatus;
  progress: number;
  dueDateLabel: string;
  isOverdue: boolean;
};

const FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "IN_PROGRESS", label: "Đang thực hiện" },
  { value: "DONE", label: "Hoàn thành" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

export function MyTasksTable({ tasks }: { tasks: MyTask[] }) {
  const [filter, setFilter] = useState<FilterValue>("ALL");

  if (tasks.length === 0) {
    return (
      <div className="grid justify-items-center gap-3 rounded-xl border border-border px-4 py-16 text-center">
        <CheckSquare className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Bạn chưa được giao task nào. PM sẽ giao task khi bạn được thêm vào
          project.
        </p>
      </div>
    );
  }

  const filtered =
    filter === "ALL" ? tasks : tasks.filter((t) => t.status === filter);

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

      <div className="overflow-x-auto rounded-xl border border-border">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Không có task nào ở trạng thái này.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Task</th>
                <th className="px-4 py-2.5 font-medium">Dự án</th>
                <th className="px-4 py-2.5 font-medium">Tiến độ</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium">Hạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((task) => (
                <tr key={task.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="hover:underline underline-offset-4"
                    >
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {task.projectName}
                  </td>
                  <td className="px-4 py-3">
                    <TaskProgress value={task.progress} className="w-32" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={task.status} />
                      {task.isOverdue && (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 text-destructive"
                        >
                          Quá hạn
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap text-muted-foreground">
                    {task.dueDateLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

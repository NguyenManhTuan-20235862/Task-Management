import type { TaskStatus } from "@prisma/client";

type ProjectWithTasksAndPm = {
  id: string;
  name: string;
  tasks: { progress: number; status: TaskStatus; dueDate: Date }[];
  members: { user: { name: string } }[];
};

export type ProjectSummary = {
  id: string;
  name: string;
  pmName: string | undefined;
  taskCount: number;
  doneCount: number;
  inProgressCount: number;
  todoCount: number;
  avgProgress: number;
  latestDue: Date | null;
  status: TaskStatus;
};

// Dùng chung cho dashboard (5 project gần đây) và trang /projects (toàn bộ) —
// tránh lặp lại cùng một phép tính ở hai nơi.
export function summarizeProject(project: ProjectWithTasksAndPm): ProjectSummary {
  const taskCount = project.tasks.length;
  const doneCount = project.tasks.filter((t) => t.status === "DONE").length;
  const inProgressCount = project.tasks.filter(
    (t) => t.status === "IN_PROGRESS",
  ).length;
  const todoCount = project.tasks.filter((t) => t.status === "TODO").length;
  const avgProgress =
    taskCount > 0
      ? Math.round(
          project.tasks.reduce((sum, t) => sum + t.progress, 0) / taskCount,
        )
      : 0;
  const latestDue = project.tasks.reduce<Date | null>((max, t) => {
    if (!max || t.dueDate > max) return t.dueDate;
    return max;
  }, null);
  // Trạng thái suy ra từ dữ liệu task thật — schema không có field "tạm dừng"
  // riêng cho project nên chỉ dùng 3 mức đã có (TODO/IN_PROGRESS/DONE).
  const status: TaskStatus =
    taskCount === 0 ? "TODO" : doneCount === taskCount ? "DONE" : "IN_PROGRESS";

  return {
    id: project.id,
    name: project.name,
    pmName: project.members[0]?.user.name,
    taskCount,
    doneCount,
    inProgressCount,
    todoCount,
    avgProgress,
    latestDue,
    status,
  };
}

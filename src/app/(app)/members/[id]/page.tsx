import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

import { ProjectStatusBadge } from "@/components/project/project-status-badge";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/task/status-badge";
import { TaskProgress } from "@/components/task/task-progress";
import { UserAvatar } from "@/components/user/user-avatar";
import { ForbiddenError, requireRole, requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { summarizeProject } from "@/lib/queries/project-summary";

const roleLabels = { ADMIN: "Admin", PM: "PM", DEV: "Dev" } as const;

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireUser();
  try {
    // Xem chi tiết thành viên là góc nhìn quản trị hệ thống — chỉ Admin (§2).
    requireRole(user, ["ADMIN"]);
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const member = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  // Trang này chỉ dành cho PM/Dev — Admin không phải "thành viên" cần xem chi tiết.
  if (!member || member.role === "ADMIN") notFound();

  const projectsRaw = await db.project.findMany({
    where: { members: { some: { userId: member.id } } },
    select: {
      id: true,
      name: true,
      startDate: true,
      dueDate: true,
      tasks: { select: { progress: true, status: true, dueDate: true } },
      members: {
        where: { user: { role: "PM" } },
        select: { user: { select: { name: true } } },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const projects = projectsRaw.map((project) => ({
    ...summarizeProject(project),
    startDate: project.startDate,
    dueDate: project.dueDate,
  }));

  const tasks =
    member.role === "DEV"
      ? await db.task.findMany({
          where: { assigneeId: member.id },
          select: {
            id: true,
            title: true,
            status: true,
            progress: true,
            dueDate: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: { dueDate: "asc" },
        })
      : [];

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <Link
          href="/members"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Thành viên
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <UserAvatar name={member.name} />
          <div className="grid gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {member.name}
            </h1>
            <p className="text-sm text-muted-foreground">{member.email}</p>
          </div>
          <Badge variant="outline">{roleLabels[member.role]}</Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Tham gia ngày {format(member.createdAt, "dd/MM/yyyy")}
        </p>
      </div>

      <div className="grid gap-4">
        <h2 className="text-sm font-medium">Dự án tham gia ({projects.length})</h2>

        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa được thêm vào project nào.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Dự án</th>
                  <th className="px-4 py-2.5 font-medium">Thời gian</th>
                  <th className="px-4 py-2.5 font-medium">Tiến độ</th>
                  <th className="px-4 py-2.5 font-medium">Task</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/projects/${project.id}`}
                        className="hover:underline underline-offset-4"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {format(project.startDate, "dd/MM/yyyy")} –{" "}
                      {format(project.dueDate, "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <TaskProgress value={project.avgProgress} className="w-32" />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {project.doneCount} / {project.taskCount}
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {member.role === "DEV" && (
        <div className="grid gap-4">
          <h2 className="text-sm font-medium">Task được giao ({tasks.length})</h2>

          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Chưa được giao task nào.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Task</th>
                    <th className="px-4 py-2.5 font-medium">Dự án</th>
                    <th className="px-4 py-2.5 font-medium">Tiến độ</th>
                    <th className="px-4 py-2.5 font-medium">Hạn chót</th>
                    <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tasks.map((task) => (
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
                        <Link
                          href={`/projects/${task.project.id}`}
                          className="hover:underline underline-offset-4"
                        >
                          {task.project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <TaskProgress value={task.progress} className="w-32" />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {format(task.dueDate, "dd/MM/yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={task.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

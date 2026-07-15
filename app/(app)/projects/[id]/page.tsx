import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Plus } from "lucide-react";

import { AddDevDialog } from "@/components/project/add-dev-dialog";
import { AddPmDialog } from "@/components/project/add-pm-dialog";
import { RemoveMemberButton } from "@/components/project/remove-member-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/task/status-badge";
import { TaskDialog } from "@/components/task/task-dialog";
import { TaskProgress } from "@/components/task/task-progress";
import { UserAvatar } from "@/components/user/user-avatar";
import { ForbiddenError, requireProjectRole, requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { summarizeProject } from "@/lib/queries/project-summary";

const roleLabels = { ADMIN: "Admin", PM: "PM", DEV: "Dev" } as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireUser();

  const project = await db.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      startDate: true,
      dueDate: true,
      members: {
        select: {
          userId: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      tasks: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          progress: true,
          startDate: true,
          dueDate: true,
          assigneeId: true,
          assignee: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });
  if (!project) notFound();

  try {
    // Không lộ sự tồn tại của project cho người ngoài (cùng pattern với Task Detail).
    await requireProjectRole(project.id, user, ["ADMIN", "PM", "DEV"]);
  } catch (error) {
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const pmMembers = project.members.filter((m) => m.user.role === "PM");
  const devMembers = project.members.filter((m) => m.user.role === "DEV");
  const summary = summarizeProject({
    ...project,
    members: pmMembers,
  });

  const isAdmin = user.role === "ADMIN";
  // Guard phía trên đã đảm bảo non-admin là thành viên project — PM tới được
  // đây nghĩa là PM quản lý project này.
  const isManagingPm = user.role === "PM";
  const canManageMembers = isAdmin || isManagingPm;

  // Danh sách ứng viên cho dialog thêm thành viên — chỉ query khi có quyền dùng.
  const memberIds = project.members.map((m) => m.userId);
  const [pmOptions, devOptions] = await Promise.all([
    isAdmin
      ? db.user
          .findMany({
            where: { role: "PM", id: { notIn: memberIds } },
            select: {
              id: true,
              name: true,
              _count: { select: { memberships: true } },
            },
            orderBy: { name: "asc" },
          })
          .then((pms) =>
            pms.map((pm) => ({
              id: pm.id,
              name: pm.name,
              projectCount: pm._count.memberships,
            })),
          )
      : Promise.resolve([]),
    canManageMembers
      ? db.user.findMany({
          where: { role: "DEV", id: { notIn: memberIds } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const assigneeOptions = devMembers.map((m) => ({
    id: m.user.id,
    name: m.user.name,
  }));

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <Link
          href="/projects"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Dự án
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              {format(project.startDate, "dd/MM/yyyy")} –{" "}
              {format(project.dueDate, "dd/MM/yyyy")} · Tạo ngày{" "}
              {format(project.createdAt, "dd/MM/yyyy")}
            </p>
          </div>
          <StatusBadge status={summary.status} />
        </div>

        <div className="grid gap-2 sm:max-w-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tiến độ trung bình</span>
            <span className="font-medium text-foreground">{summary.avgProgress}%</span>
          </div>
          <TaskProgress value={summary.avgProgress} showValue={false} />
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="text-[oklch(0.5_0.15_155)] dark:text-[oklch(0.75_0.15_155)]">
            {summary.doneCount} Xong
          </span>
          <span className="text-primary">{summary.inProgressCount} Đang làm</span>
          <span>{summary.todoCount} Chờ</span>
          <span>
            Tổng: <span className="font-medium text-foreground">{summary.taskCount}</span> task
          </span>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">
            Thành viên ({project.members.length})
          </h2>
          <div className="flex items-center gap-2">
            {canManageMembers && (
              <AddDevDialog projectId={project.id} devOptions={devOptions} />
            )}
            {isAdmin && (
              <AddPmDialog projectId={project.id} pmOptions={pmOptions} />
            )}
          </div>
        </div>

        {project.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có thành viên nào.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {[...pmMembers, ...devMembers].map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-2.5 rounded-xl border border-border px-3 py-2.5"
              >
                <UserAvatar name={member.user.name} size="sm" />
                <div className="grid min-w-0 flex-1 gap-0">
                  <p className="truncate text-sm font-medium">{member.user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.user.email}
                  </p>
                </div>
                <Badge variant="outline">{roleLabels[member.user.role]}</Badge>
                {canManageMembers && member.user.role === "DEV" && (
                  <RemoveMemberButton
                    projectId={project.id}
                    memberUserId={member.userId}
                    memberName={member.user.name}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Task ({project.tasks.length})</h2>
          {isManagingPm &&
            (assigneeOptions.length > 0 ? (
              <TaskDialog
                mode="create"
                projectId={project.id}
                devOptions={assigneeOptions}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Thêm Dev vào project trước khi tạo task
                </span>
                <Button size="sm" disabled>
                  <Plus data-icon="inline-start" aria-hidden />
                  Tạo task
                </Button>
              </div>
            ))}
        </div>

        {project.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Project chưa có task nào.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Task</th>
                  <th className="px-4 py-2.5 font-medium">Người thực hiện</th>
                  <th className="px-4 py-2.5 font-medium">Tiến độ</th>
                  <th className="px-4 py-2.5 font-medium">Hạn chót</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                  {isManagingPm && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {project.tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="hover:underline underline-offset-4"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={task.assignee.name} size="sm" />
                        <span className="text-muted-foreground">
                          {task.assignee.name}
                        </span>
                      </div>
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
                    {isManagingPm && (
                      <td className="px-4 py-3">
                        <TaskDialog
                          mode="edit"
                          taskId={task.id}
                          devOptions={assigneeOptions}
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
    </div>
  );
}

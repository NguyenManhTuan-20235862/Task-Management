import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Plus } from "lucide-react";

import { AddDevDialog } from "@/components/project/add-dev-dialog";
import { AddPmDialog } from "@/components/project/add-pm-dialog";
import { ProjectActivityFeed } from "@/components/project/project-activity-feed";
import { ProjectDetailTabs } from "@/components/project/project-detail-tabs";
import { ProjectStatusBadge } from "@/components/project/project-status-badge";
import { ProjectTasksTable } from "@/components/project/project-tasks-table";
import { RemoveMemberButton } from "@/components/project/remove-member-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/task/status-badge";
import { TaskDialog } from "@/components/task/task-dialog";
import { TaskProgress } from "@/components/task/task-progress";
import { UserAvatar } from "@/components/user/user-avatar";
import { ForbiddenError, requireProjectRole, requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { summarizeProject } from "@/lib/queries/project-summary";
import { cn } from "@/lib/utils";

const ACTIVITY_LIMIT = 10;

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
          createdAt: true,
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
  const isDev = user.role === "DEV";
  const canManageMembers = isAdmin || isManagingPm;

  // Danh sách ứng viên cho dialog thêm thành viên — chỉ query khi có quyền dùng.
  const memberIds = project.members.map((m) => m.userId);
  const [pmOptions, devOptions, activitiesRaw] = await Promise.all([
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
    db.activityLog.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_LIMIT,
      select: {
        id: true,
        message: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    }),
  ]);

  const activities = activitiesRaw.map((a) => ({
    id: a.id,
    actorName: a.actor.name,
    message: a.message,
    createdAt: a.createdAt,
  }));

  const assigneeOptions = devMembers.map((m) => ({
    id: m.user.id,
    name: m.user.name,
  }));

  // Số task chưa DONE của mỗi Dev, chỉ trong project này — nguồn cho cảnh báo
  // mềm khi PM chọn assignee trong TaskDialog (không chặn, chỉ để cân nhắc), và
  // cho badge "N task" ở card thành viên.
  const devWorkload = Object.fromEntries(
    devMembers.map((m) => [
      m.userId,
      project.tasks.filter((t) => t.assigneeId === m.userId && t.status !== "DONE")
        .length,
    ]),
  );

  const membersContent = (
    <>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Quản lý dự án (PM)</h2>
        </div>

        {pmMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có PM quản lý.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {pmMembers.map((member) => (
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
                <Badge variant="outline">PM</Badge>
              </div>
            ))}
          </div>
        )}

        {isAdmin ? (
          <div>
            <AddPmDialog projectId={project.id} pmOptions={pmOptions} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Chỉ Admin thêm được PM vào dự án.
          </p>
        )}
      </div>

      <div className="grid gap-3">
        <h2 className="text-sm font-medium">Dev ({devMembers.length})</h2>

        {devMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có Dev nào.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {devMembers.map((member) => (
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
                <Badge variant="outline">
                  {devWorkload[member.userId] ?? 0} task
                </Badge>
                {canManageMembers && (
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

        {canManageMembers && (
          <div>
            <AddDevDialog projectId={project.id} devOptions={devOptions} />
          </div>
        )}
      </div>
    </>
  );

  const tasksContent = (
    <>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {isManagingPm &&
          (assigneeOptions.length > 0 ? (
            <TaskDialog
              mode="create"
              projectId={project.id}
              devOptions={assigneeOptions}
              devWorkload={devWorkload}
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

      {isDev ? (
        <div className="grid gap-8">
          <div className="grid gap-3">
            <h2 className="text-sm font-medium">Task của tôi trong dự án</h2>
            <ProjectTasksTable
              tasks={project.tasks
                .filter((task) => task.assigneeId === user.id)
                .map((task) => ({
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  status: task.status,
                  progress: task.progress,
                  startDate: task.startDate,
                  dueDate: task.dueDate,
                  assigneeId: task.assigneeId,
                  assigneeName: task.assignee.name,
                }))}
              isManagingPm={false}
              assigneeOptions={[]}
              devWorkload={{}}
              emptyMessage="Bạn chưa được giao task nào trong dự án này."
            />
          </div>

          <div className="grid gap-3">
            <h2 className="text-sm font-medium">Task của toàn bộ dự án</h2>
            {project.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Project chưa có task nào.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">
                        Task
                      </th>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">
                        Người thực hiện
                      </th>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">
                        Tiến độ
                      </th>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">
                        Trạng thái
                      </th>
                      <th className="px-4 py-2.5 font-medium whitespace-nowrap">Hạn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[...project.tasks]
                      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
                      .map((task) => (
                        <tr
                          key={task.id}
                          className={cn(
                            "hover:bg-muted/40",
                            task.assigneeId === user.id && "bg-primary/5",
                          )}
                        >
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
                              <UserAvatar name={task.assignee.name} size="sm" />
                              <span className="text-muted-foreground">
                                {task.assignee.name}
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
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <ProjectTasksTable
          tasks={project.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            progress: task.progress,
            startDate: task.startDate,
            dueDate: task.dueDate,
            assigneeId: task.assigneeId,
            assigneeName: task.assignee.name,
          }))}
          isManagingPm={isManagingPm}
          assigneeOptions={assigneeOptions}
          devWorkload={devWorkload}
        />
      )}
    </>
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="grid gap-2">
          <Link
            href="/projects"
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Dự án
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <ProjectStatusBadge status={summary.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {format(project.startDate, "dd/MM/yyyy")} →{" "}
            {format(project.dueDate, "dd/MM/yyyy")}
          </p>
        </div>

        <ProjectActivityFeed activities={activities} className="w-full sm:w-96" />
      </div>

      <ProjectDetailTabs
        membersContent={membersContent}
        tasksContent={tasksContent}
      />
    </div>
  );
}

import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  CheckSquare,
  CircleAlert,
  FolderKanban,
  Loader,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";

import { CreateProjectDialog } from "@/components/project/create-project-dialog";
import { ProjectCard } from "@/components/project/project-card";
import { ProjectStatusBadge } from "@/components/project/project-status-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { MyTasksTable, type MyTask } from "@/components/task/my-tasks-table";
import { TaskProgress } from "@/components/task/task-progress";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { requireUser } from "@/lib/auth/guard";
import { DEV_OVERLOAD_TASK_THRESHOLD } from "@/lib/constants";
import { db } from "@/lib/db";
import { summarizeProject } from "@/lib/queries/project-summary";

const PM_PAGE_SIZE = 3;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user } = await requireUser();

  if (user.role === "DEV") {
    return <DevDashboard userId={user.id} />;
  }

  if (user.role === "PM") {
    return <PmDashboard userId={user.id} />;
  }

  return <AdminOverview searchParams={searchParams} />;
}

// Màn hình PM xem hàng ngày (CLAUDE.md §4): task theo trạng thái, quá hạn,
// tiến độ — mọi số liệu scope theo project mình là thành viên, không toàn hệ thống.
async function PmDashboard({ userId }: { userId: string }) {
  // So sánh với cột @db.Date (UTC midnight): quá hạn = dueDate trước hôm nay.
  const todayUtc = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const memberScope = { members: { some: { userId } } };

  const [projectsRaw, overdueTasks] = await Promise.all([
    db.project.findMany({
      where: memberScope,
      include: {
        tasks: {
          select: { progress: true, status: true, dueDate: true, assigneeId: true },
        },
        members: {
          select: { userId: true, user: { select: { name: true, role: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.task.findMany({
      where: {
        project: memberScope,
        status: { not: "DONE" },
        dueDate: { lt: todayUtc },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        progress: true,
        project: { select: { name: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  const projects = projectsRaw.map((project) => {
    const pmMembers = project.members.filter((m) => m.user.role === "PM");
    return {
      ...summarizeProject({ ...project, members: pmMembers }),
      memberCount: project.members.length,
    };
  });

  const allTasks = projectsRaw.flatMap((p) => p.tasks);
  const inProgressCount = allTasks.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = allTasks.filter((t) => t.status === "DONE").length;
  const avgProgress =
    allTasks.length > 0
      ? Math.round(allTasks.reduce((sum, t) => sum + t.progress, 0) / allTasks.length)
      : 0;

  // Khối lượng công việc theo Dev — chỉ tính trong các project mình quản lý
  // (không lộ task Dev đang làm cho PM khác, đúng §2 mục 8).
  const devWorkloadMap = new Map<string, { name: string; notDone: number; done: number }>();
  for (const project of projectsRaw) {
    for (const member of project.members) {
      if (member.user.role !== "DEV") continue;
      if (!devWorkloadMap.has(member.userId)) {
        devWorkloadMap.set(member.userId, { name: member.user.name, notDone: 0, done: 0 });
      }
    }
    for (const task of project.tasks) {
      const entry = devWorkloadMap.get(task.assigneeId);
      if (!entry) continue;
      if (task.status === "DONE") entry.done += 1;
      else entry.notDone += 1;
    }
  }
  const devWorkload = [...devWorkloadMap.entries()]
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.notDone - a.notDone);

  const today = format(new Date(), "EEEE, d 'tháng' M, yyyy", { locale: vi });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tổng quan dự án của tôi
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{today}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CircleAlert}
          value={String(overdueTasks.length)}
          label="Task quá hạn"
          sublabel="Cần xử lý ngay"
          tone="amber"
        />
        <StatCard
          icon={Loader}
          value={String(inProgressCount)}
          label="Đang làm"
          sublabel="Trên các project của tôi"
          tone="primary"
        />
        <StatCard
          icon={CheckSquare}
          value={String(doneCount)}
          label="Hoàn thành"
          sublabel={`Trên tổng ${allTasks.length} task`}
          tone="emerald"
        />
        <StatCard
          icon={TrendingUp}
          value={`${avgProgress}%`}
          label="Tiến độ TB"
          sublabel="Mọi task của tôi quản lý"
          tone="neutral"
        />
      </div>

      {overdueTasks.length > 0 && (
        <div className="rounded-xl border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">
              Task quá hạn ({overdueTasks.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Task</th>
                  <th className="px-4 py-2.5 font-medium">Dự án</th>
                  <th className="px-4 py-2.5 font-medium">Người thực hiện</th>
                  <th className="px-4 py-2.5 font-medium">Tiến độ</th>
                  <th className="px-4 py-2.5 font-medium">Hạn chót</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {overdueTasks.map((task) => (
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
                      {task.project.name}
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
                      <TaskProgress value={task.progress} className="w-28" />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-destructive">
                      {format(task.dueDate, "dd/MM/yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {devWorkload.length > 0 && (
        <div className="rounded-xl border border-border">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Khối lượng công việc theo Dev</h2>
            <p className="text-xs text-muted-foreground">
              Số task chưa hoàn thành trong các project bạn quản lý — dùng để cân
              nhắc khi giao task mới.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Dev</th>
                  <th className="px-4 py-2.5 font-medium">Chưa hoàn thành</th>
                  <th className="px-4 py-2.5 font-medium">Đã hoàn thành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {devWorkload.map((dev) => {
                  const isOverloaded = dev.notDone >= DEV_OVERLOAD_TASK_THRESHOLD;
                  return (
                    <tr key={dev.userId} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar name={dev.name} size="sm" />
                          <span className="font-medium">{dev.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <span
                          className={
                            isOverloaded
                              ? "font-medium text-[oklch(0.5_0.15_85)] dark:text-[oklch(0.75_0.15_85)]"
                              : "text-muted-foreground"
                          }
                        >
                          {dev.notDone}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {dev.done}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        <h2 className="text-sm font-medium">Dự án của tôi ({projects.length})</h2>
        {projects.length === 0 ? (
          <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
            <FolderKanban className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Bạn chưa quản lý project nào. Admin sẽ thêm bạn vào project.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                memberCount={project.memberCount}
                tone={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const DEV_RECENT_TASKS_LIMIT = 10;
const DEV_RECENT_PROJECTS_LIMIT = 4;

// Màn hình chính của Dev (CLAUDE.md §4 "my-tasks"): chỉ task được giao cho
// chính mình, scope ngay trong where — Dev không thấy task của Dev khác.
async function DevDashboard({ userId }: { userId: string }) {
  const todayUtc = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);

  const [tasksRaw, memberships, projectCount] = await Promise.all([
    db.task.findMany({
      where: { assigneeId: userId },
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        dueDate: true,
        updatedAt: true,
        project: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    db.projectMember.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: DEV_RECENT_PROJECTS_LIMIT,
      select: {
        project: {
          select: {
            id: true,
            name: true,
            tasks: { select: { progress: true, status: true, dueDate: true } },
            members: { select: { user: { select: { name: true, role: true } } } },
            _count: { select: { members: true } },
          },
        },
      },
    }),
    db.projectMember.count({ where: { userId } }),
  ]);

  const overdueCount = tasksRaw.filter(
    (t) => t.status !== "DONE" && t.dueDate < todayUtc,
  ).length;
  const inProgressCount = tasksRaw.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = tasksRaw.filter((t) => t.status === "DONE").length;

  const toMyTask = (task: (typeof tasksRaw)[number]): MyTask => ({
    id: task.id,
    title: task.title,
    projectName: task.project.name,
    status: task.status,
    progress: task.progress,
    dueDateLabel: format(task.dueDate, "dd/MM/yyyy"),
    isOverdue: task.status !== "DONE" && task.dueDate < todayUtc,
  });

  // Không có cột riêng "lần cập nhật tiến độ gần nhất" — dùng Task.updatedAt
  // (Prisma tự cập nhật khi bất kỳ field nào của task đổi) làm proxy, đã chốt
  // với người dùng là chấp nhận được cho quy mô nội bộ hiện tại.
  const byUpdatedAtDesc = (a: (typeof tasksRaw)[number], b: (typeof tasksRaw)[number]) =>
    b.updatedAt.getTime() - a.updatedAt.getTime();

  const activeTasks = tasksRaw
    .filter((t) => t.status !== "DONE")
    .sort(byUpdatedAtDesc)
    .slice(0, DEV_RECENT_TASKS_LIMIT)
    .map(toMyTask);
  const doneTasks = tasksRaw
    .filter((t) => t.status === "DONE")
    .sort(byUpdatedAtDesc)
    .slice(0, DEV_RECENT_TASKS_LIMIT)
    .map(toMyTask);

  const recentProjects = memberships.map(({ project }) => {
    const pmMembers = project.members.filter((m) => m.user.role === "PM");
    return {
      ...summarizeProject({ ...project, members: pmMembers }),
      memberCount: project._count.members,
    };
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Việc của tôi</h1>
        <p className="text-sm text-muted-foreground">Các task được giao cho bạn</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Loader}
          value={String(inProgressCount)}
          label="Đang thực hiện"
          sublabel={`Trên ${tasksRaw.length} task được giao`}
          tone="primary"
        />
        <StatCard
          icon={CircleAlert}
          value={String(overdueCount)}
          label="Quá hạn"
          sublabel="Cần xử lý ngay"
          tone="amber"
        />
        <StatCard
          icon={CheckSquare}
          value={String(doneCount)}
          label="Hoàn thành"
          sublabel={`Trên tổng ${tasksRaw.length} task`}
          tone="emerald"
        />
      </div>

      <MyTasksTable
        activeTasks={activeTasks}
        doneTasks={doneTasks}
        hasAnyTask={tasksRaw.length > 0}
      />

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Dự án của tôi ({projectCount})</h2>
          {recentProjects.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/projects" />}
            >
              Xem tất cả
            </Button>
          )}
        </div>

        {recentProjects.length === 0 ? (
          <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
            <FolderKanban className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Bạn chưa tham gia project nào. Admin sẽ thêm bạn vào project.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recentProjects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                memberCount={project.memberCount}
                tone={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function AdminOverview({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawPmPage = Array.isArray(params.pmPage) ? params.pmPage[0] : params.pmPage;

  const [
    totalProjects,
    totalTasks,
    doneTasks,
    totalMembers,
    progressAgg,
    recentProjectsRaw,
    pmAll,
  ] = await Promise.all([
    db.project.count(),
    db.task.count(),
    db.task.count({ where: { status: "DONE" } }),
    db.user.count({ where: { role: { not: "ADMIN" } } }),
    db.task.aggregate({ _avg: { progress: true } }),
    db.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        tasks: { select: { progress: true, status: true, dueDate: true } },
        members: {
          where: { user: { role: "PM" } },
          select: { user: { select: { name: true } } },
          take: 1,
        },
      },
    }),
    db.user.findMany({
      where: { role: "PM" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        _count: { select: { memberships: true } },
      },
    }),
  ]);

  const avgProgress = Math.round(progressAgg._avg.progress ?? 0);
  const recentProjects = recentProjectsRaw.map(summarizeProject);

  const pmOptionsFormatted = pmAll.map((pm) => ({
    id: pm.id,
    name: pm.name,
    projectCount: pm._count.memberships,
  }));

  // Danh sách PM đủ nhỏ (nội bộ) nên lấy hết 1 lần rồi phân trang bằng slice —
  // tránh 1 query DB riêng chỉ để đếm total, và đảm bảo total luôn khớp pmOptions.
  const pmTotalPages = Math.max(1, Math.ceil(pmAll.length / PM_PAGE_SIZE));
  const pmPage = Math.min(Math.max(1, Number(rawPmPage) || 1), pmTotalPages);
  const pmPageMembers = pmAll.slice(
    (pmPage - 1) * PM_PAGE_SIZE,
    pmPage * PM_PAGE_SIZE,
  );

  const today = format(new Date(), "EEEE, d 'tháng' M, yyyy", { locale: vi });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tổng quan hệ thống
          </h1>
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
        </div>
        <CreateProjectDialog pmOptions={pmOptionsFormatted} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderKanban}
          value={String(totalProjects)}
          label="Tổng dự án"
          sublabel="Toàn hệ thống"
          tone="primary"
        />
        <StatCard
          icon={CheckSquare}
          value={String(totalTasks)}
          label="Tổng task"
          sublabel={`${doneTasks} hoàn thành`}
          tone="emerald"
        />
        <StatCard
          icon={Users}
          value={String(totalMembers)}
          label="Thành viên"
          sublabel="PM và Dev"
          tone="neutral"
        />
        <StatCard
          icon={TrendingUp}
          value={`${avgProgress}%`}
          label="Tiến độ TB"
          sublabel="Toàn bộ project"
          tone="amber"
        />
      </div>

      <div className="rounded-xl border border-border">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium">Dự án gần đây</h2>
          <Button
            variant="link"
            size="sm"
            nativeButton={false}
            render={<Link href="/projects" />}
          >
            Xem tất cả
          </Button>
        </div>

        {recentProjects.length === 0 ? (
          <div className="grid justify-items-center gap-3 px-4 py-16 text-center">
            <Plus className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Chưa có project nào. Bấm &quot;Tạo project&quot; để bắt đầu.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Tên dự án</th>
                  <th className="px-4 py-2.5 font-medium">PM</th>
                  <th className="px-4 py-2.5 font-medium">Tiến độ</th>
                  <th className="px-4 py-2.5 font-medium">Task</th>
                  <th className="px-4 py-2.5 font-medium">Hạn chót</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentProjects.map((project) => (
                  <tr key={project.id}>
                    <td className="px-4 py-3 font-medium">{project.name}</td>
                    <td className="px-4 py-3">
                      {project.pmName ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar name={project.pmName} size="sm" />
                          <span className="text-muted-foreground">
                            {project.pmName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <TaskProgress value={project.avgProgress} className="w-32" />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {project.doneCount} / {project.taskCount}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {project.latestDue
                        ? format(project.latestDue, "dd/MM/yyyy")
                        : "-"}
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

      {pmAll.length > 0 && (
        <div className="rounded-xl border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">PM ({pmAll.length})</h2>
            {pmTotalPages > 1 && (
              <span className="text-xs text-muted-foreground">
                Trang {pmPage}/{pmTotalPages}
              </span>
            )}
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3">
            {pmPageMembers.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
              >
                <UserAvatar name={pm.name} />
                <div className="grid min-w-0 flex-1 gap-0">
                  <p className="truncate text-sm font-medium">{pm.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {pm.email}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {pmTotalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              {pmPage > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/?pmPage=${pmPage - 1}`} />}
                >
                  Trước
                </Button>
              ) : (
                <span />
              )}
              {pmPage < pmTotalPages ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/?pmPage=${pmPage + 1}`} />}
                >
                  Sau
                </Button>
              ) : (
                <span />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

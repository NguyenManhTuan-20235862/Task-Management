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
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/task/status-badge";
import { TaskProgress } from "@/components/task/task-progress";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { summarizeProject } from "@/lib/queries/project-summary";

// Task mẫu từ prisma/seed.ts — chỉ user thuộc project "Website nội bộ" xem được,
// người khác bấm vào sẽ thấy 404 (đúng hành vi §2 mục 6: không lộ task ngoài project).
const seedTasks = [
  { id: "seed-task-1", title: "Thiết kế lại trang đăng nhập" },
  { id: "seed-task-2", title: "Viết tài liệu API cho module Task" },
  { id: "seed-task-3", title: "Tối ưu tốc độ tải trang chủ" },
];

const roleLabels = {
  ADMIN: "Quản trị viên",
  PM: "Quản lý dự án",
  DEV: "Lập trình viên",
} as const;

export default async function HomePage() {
  const { user } = await requireUser();

  if (user.role === "DEV") {
    return (
      <div className="grid gap-10">
        <div className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Xin chào
          </h1>
          <p className="text-sm text-muted-foreground">
            Bạn đang đăng nhập với vai trò{" "}
            <span className="font-medium text-foreground">
              {roleLabels[user.role]}
            </span>
            . Các màn hình quản lý task sẽ xuất hiện ở đây.
          </p>
        </div>

        <div className="grid gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Task mẫu (dữ liệu seed)
          </h2>
          <ul className="grid gap-1.5">
            {seedTasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/tasks/${task.id}`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (user.role === "PM") {
    return <PmDashboard userId={user.id} />;
  }

  return <AdminOverview />;
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
        tasks: { select: { progress: true, status: true, dueDate: true } },
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

async function AdminOverview() {
  const [
    totalProjects,
    totalTasks,
    doneTasks,
    totalMembers,
    progressAgg,
    recentProjectsRaw,
    recentMembers,
    pmOptions,
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
      where: { role: { not: "ADMIN" } },
      orderBy: { createdAt: "asc" },
      take: 3,
      select: { id: true, name: true, email: true, role: true },
    }),
    db.user.findMany({
      where: { role: "PM" },
      select: { id: true, name: true, _count: { select: { memberships: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const avgProgress = Math.round(progressAgg._avg.progress ?? 0);
  const recentProjects = recentProjectsRaw.map(summarizeProject);

  const pmOptionsFormatted = pmOptions.map((pm) => ({
    id: pm.id,
    name: pm.name,
    projectCount: pm._count.memberships,
  }));

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
                      <StatusBadge status={project.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {recentMembers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recentMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
            >
              <UserAvatar name={member.name} />
              <div className="grid min-w-0 flex-1 gap-0">
                <p className="truncate text-sm font-medium">{member.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.email}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

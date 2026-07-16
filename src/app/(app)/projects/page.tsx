import { Plus } from "lucide-react";

import { CreateProjectDialog } from "@/components/project/create-project-dialog";
import { ProjectCard } from "@/components/project/project-card";
import { requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { summarizeProject } from "@/lib/queries/project-summary";

export default async function ProjectsPage() {
  const { user } = await requireUser();

  // Scope ngay trong where — không fetch hết rồi lọc bằng JS (CLAUDE.md §5).
  const projectsRaw = await db.project.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : { members: { some: { userId: user.id } } },
    include: {
      tasks: { select: { progress: true, status: true, dueDate: true } },
      members: {
        select: { userId: true, user: { select: { name: true, role: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const projects = projectsRaw.map((project) => {
    // summarizeProject cần members đã lọc theo PM để lấy đúng tên PM quản lý
    const pmMembers = project.members.filter((m) => m.user.role === "PM");
    return {
      ...summarizeProject({ ...project, members: pmMembers }),
      memberCount: project.members.length,
    };
  });

  const activeCount = projects.filter((p) => p.status === "IN_PROGRESS").length;

  const pmOptions =
    user.role === "ADMIN"
      ? (
          await db.user.findMany({
            where: { role: "PM" },
            select: { id: true, name: true, _count: { select: { memberships: true } } },
            orderBy: { name: "asc" },
          })
        ).map((pm) => ({ id: pm.id, name: pm.name, projectCount: pm._count.memberships }))
      : [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Quản lý dự án
          </h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} dự án{" "}
            {projects.length > 0 && `· ${activeCount} đang hoạt động`}
          </p>
        </div>
        {user.role === "ADMIN" && <CreateProjectDialog pmOptions={pmOptions} />}
      </div>

      {projects.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Plus className="size-8 text-muted-foreground" aria-hidden />
          <div className="grid gap-1">
            <p className="text-sm font-medium">Chưa có project nào</p>
            <p className="text-sm text-muted-foreground">
              {user.role === "ADMIN"
                ? "Bấm \"Tạo project\" để bắt đầu."
                : "Bạn sẽ thấy project ở đây khi được thêm vào."}
            </p>
          </div>
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
          {user.role === "ADMIN" && (
            <CreateProjectDialog
              pmOptions={pmOptions}
              trigger={
                <button
                  type="button"
                  className="grid min-h-48 place-items-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  <span className="flex size-9 items-center justify-center rounded-full border border-dashed border-current">
                    <Plus className="size-4" aria-hidden />
                  </span>
                  Tạo dự án mới
                </button>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

import { notFound } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { CommentForm } from "@/components/task/comment-form";
import { CommentItem } from "@/components/task/comment-item";
import { ProgressEditor } from "@/components/task/progress-editor";
import { StatusBadge } from "@/components/task/status-badge";
import { TaskBackLink } from "@/components/task/task-back-link";
import { TaskProgress } from "@/components/task/task-progress";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/user/user-avatar";
import { ForbiddenError, requireProjectRole, requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireUser();

  const task = await db.task.findUnique({
    where: { id },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      comments: {
        include: {
          author: { select: { name: true } },
          attachments: {
            select: { id: true, fileName: true, mimeType: true, size: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!task) notFound();

  try {
    await requireProjectRole(task.project.id, user, ["ADMIN", "PM", "DEV"]);
  } catch (error) {
    // Không lộ sự tồn tại của task cho người ngoài project (CLAUDE.md §2 mục 6)
    if (error instanceof ForbiddenError) notFound();
    throw error;
  }

  const isAssignee = task.assigneeId === user.id;
  // PM tới được đây nghĩa là thành viên project (guard phía trên) → có quyền
  // giám sát tiến độ. Admin chỉ xem (CLAUDE.md §2 — matrix cập nhật 15/07/2026).
  const canEditProgress = isAssignee || user.role === "PM";

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <TaskBackLink projectId={task.project.id} projectName={task.project.name} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {task.title}
          </h1>
          <StatusBadge status={task.status} />
        </div>
        <p className="text-sm whitespace-pre-wrap text-foreground">
          {task.description}
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <UserAvatar name={task.assignee.name} size="sm" />
            <span>{task.assignee.name}</span>
          </div>
          <span>
            {format(task.startDate, "d MMM", { locale: vi })} –{" "}
            {format(task.dueDate, "d MMM yyyy", { locale: vi })}
          </span>
        </div>
      </div>

      <Separator />

      <div className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Tiến độ
        </h2>
        {canEditProgress ? (
          <ProgressEditor taskId={task.id} initialProgress={task.progress} />
        ) : (
          <TaskProgress value={task.progress} />
        )}
      </div>

      <Separator />

      <div className="grid gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Bình luận{task.comments.length > 0 && ` (${task.comments.length})`}
        </h2>
        {task.comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có bình luận nào.
          </p>
        ) : (
          <div className="grid gap-4">
            {task.comments.map((comment) => (
              <CommentItem
                key={comment.id}
                id={comment.id}
                authorName={comment.author.name}
                body={comment.body}
                createdAt={comment.createdAt}
                updatedAt={comment.updatedAt}
                canEdit={user.role === "ADMIN" || comment.authorId === user.id}
                attachments={comment.attachments}
              />
            ))}
          </div>
        )}
        <CommentForm taskId={task.id} />
      </div>
    </div>
  );
}

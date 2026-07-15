"use server";

import { revalidatePath } from "next/cache";
import type { TaskStatus } from "@prisma/client";

import { safeAction } from "@/lib/actions/safe-action";
import { ForbiddenError, requireProjectRole, requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import {
  createCommentSchema,
  createTaskSchema,
  updateCommentSchema,
  updateProgressSchema,
  updateTaskSchema,
} from "@/lib/validation/task";

function statusFromProgress(progress: number): TaskStatus {
  if (progress === 100) return "DONE";
  if (progress > 0) return "IN_PROGRESS";
  return "TODO";
}

// "YYYY-MM-DD" -> Date UTC midnight, khớp cột @db.Date (không lệch timezone).
function toDateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

// Assignee phải là DEV và là thành viên project (CLAUDE.md §2 mục 5) — Prisma
// không enforce được, check trong cùng transaction với lệnh ghi task, khoá row
// ProjectMember (FOR UPDATE) để removeProjectMember (cũng khoá row này) không
// thể xoá Dev khỏi project xen giữa lúc check và lúc gán task (write-skew).
type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function assertAssigneeIsProjectDev(
  tx: Tx,
  projectId: string,
  assigneeId: string,
) {
  const locked = await tx.$queryRaw<{ userId: string }[]>`
    SELECT "userId" FROM "ProjectMember"
    WHERE "projectId" = ${projectId} AND "userId" = ${assigneeId}
    FOR UPDATE`;
  const assignee =
    locked.length > 0
      ? await tx.user.findFirst({
          where: { id: assigneeId, role: "DEV" },
          select: { id: true },
        })
      : null;
  if (!assignee) {
    throw new ForbiddenError("Người thực hiện phải là Dev thuộc project này");
  }
}

// Chỉ PM quản lý project được tạo task (Admin không tạo/sửa/giao task — §2).
export async function createTask(input: unknown) {
  return safeAction(async () => {
    const parsed = createTaskSchema.parse(input);
    const { user } = await requireUser();
    await requireProjectRole(parsed.projectId, user, ["PM"]);

    await db.$transaction(async (tx) => {
      await assertAssigneeIsProjectDev(tx, parsed.projectId, parsed.assigneeId);

      await tx.task.create({
        data: {
          projectId: parsed.projectId,
          title: parsed.title,
          description: parsed.description,
          assigneeId: parsed.assigneeId,
          startDate: toDateOnly(parsed.startDate),
          dueDate: toDateOnly(parsed.dueDate),
        },
      });
    });

    revalidatePath(`/projects/${parsed.projectId}`);
    revalidatePath("/");
  });
}

// Chỉ PM quản lý project chứa task được sửa task. Không sửa progress ở đây —
// tiến độ đi qua updateProgress riêng.
export async function updateTask(input: unknown) {
  return safeAction(async () => {
    const parsed = updateTaskSchema.parse(input);
    const { user } = await requireUser();

    const task = await db.task.findUnique({
      where: { id: parsed.taskId },
      select: { projectId: true },
    });
    if (!task) throw new ForbiddenError("Task không tồn tại");
    await requireProjectRole(task.projectId, user, ["PM"]);

    await db.$transaction(async (tx) => {
      await assertAssigneeIsProjectDev(tx, task.projectId, parsed.assigneeId);

      await tx.task.update({
        where: { id: parsed.taskId },
        data: {
          title: parsed.title,
          description: parsed.description,
          assigneeId: parsed.assigneeId,
          startDate: toDateOnly(parsed.startDate),
          dueDate: toDateOnly(parsed.dueDate),
        },
      });
    });

    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath(`/tasks/${parsed.taskId}`);
  });
}

// Cập nhật tiến độ: Dev với task giao cho mình, hoặc PM thành viên project
// (giám sát). Admin không có quyền này (CLAUDE.md §2 — matrix cập nhật 15/07/2026).
export async function updateProgress(input: unknown) {
  return safeAction(async () => {
    const parsed = updateProgressSchema.parse(input);
    const { user } = await requireUser();

    const task = await db.task.findUnique({
      where: { id: parsed.taskId },
      select: { assigneeId: true, projectId: true },
    });
    if (!task) throw new ForbiddenError("Task không tồn tại");

    const isAssignee = task.assigneeId === user.id;
    const isSupervisingPm =
      user.role === "PM" &&
      (await db.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: task.projectId, userId: user.id },
        },
        select: { userId: true },
      })) !== null;
    if (!isAssignee && !isSupervisingPm) throw new ForbiddenError();

    await db.task.update({
      where: { id: parsed.taskId },
      data: { progress: parsed.progress, status: statusFromProgress(parsed.progress) },
    });

    revalidatePath(`/tasks/${parsed.taskId}`);
  });
}

// Mọi role trong project được comment (§2).
export async function createComment(input: unknown) {
  return safeAction(async () => {
    const parsed = createCommentSchema.parse(input);
    const { user } = await requireUser();

    const task = await db.task.findUnique({
      where: { id: parsed.taskId },
      select: { projectId: true },
    });
    if (!task) throw new ForbiddenError("Task không tồn tại");
    await requireProjectRole(task.projectId, user, ["ADMIN", "PM", "DEV"]);

    await db.comment.create({
      data: { taskId: parsed.taskId, authorId: user.id, body: parsed.body },
    });

    revalidatePath(`/tasks/${parsed.taskId}`);
  });
}

// Sửa comment: ADMIN sửa được mọi comment, PM/DEV chỉ sửa comment của mình (CLAUDE.md §2).
export async function updateComment(input: unknown) {
  return safeAction(async () => {
    const parsed = updateCommentSchema.parse(input);
    const { user } = await requireUser();

    const comment = await db.comment.findUnique({
      where: { id: parsed.commentId },
      select: { authorId: true, taskId: true, task: { select: { projectId: true } } },
    });
    if (!comment) throw new ForbiddenError("Bình luận không tồn tại");

    await requireProjectRole(comment.task.projectId, user, ["ADMIN", "PM", "DEV"]);
    if (user.role !== "ADMIN" && comment.authorId !== user.id) {
      throw new ForbiddenError("Bạn chỉ sửa được bình luận của mình");
    }

    await db.comment.update({
      where: { id: parsed.commentId },
      data: { body: parsed.body },
    });

    revalidatePath(`/tasks/${comment.taskId}`);
  });
}

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { logActivity } from "@/lib/actions/activity-log";
import { safeAction } from "@/lib/actions/safe-action";
import {
  ForbiddenError,
  requireProjectRole,
  requireRole,
  requireUser,
} from "@/lib/auth/guard";
import { db } from "@/lib/db";
import {
  addDevToProjectSchema,
  addProjectMemberSchema,
  createProjectSchema,
  removeProjectMemberSchema,
} from "@/lib/validation/project";

// "YYYY-MM-DD" -> Date UTC midnight, khớp cột @db.Date (không lệch timezone) —
// cùng quy ước với lib/actions/task.ts.
function toDateOnly(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

// Hai request thêm cùng một người vào cùng project chạy song song: cả hai qua
// được check "đã ở trong project chưa", nhưng DB chặn bằng unique (projectId,
// userId) — đổi P2002 thành lỗi nghiệp vụ thân thiện thay vì nổ 500.
async function createMemberOrFriendlyError(
  projectId: string,
  userId: string,
  duplicateMessage: string,
) {
  try {
    await db.projectMember.create({ data: { projectId, userId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ForbiddenError(duplicateMessage);
    }
    throw error;
  }
}

// Chỉ Admin tạo project (CLAUDE.md §2). Project + PM đầu tiên tạo trong cùng
// transaction để không bao giờ có project "mồ côi" không PM nào quản lý.
export async function createProject(input: unknown) {
  return safeAction(async () => {
    const parsed = createProjectSchema.parse(input);
    const { user } = await requireUser();
    requireRole(user, ["ADMIN"]);

    await db.$transaction(async (tx) => {
      const pm = await tx.user.findUnique({
        where: { id: parsed.pmUserId },
        select: { role: true },
      });
      if (!pm || pm.role !== "PM") {
        throw new ForbiddenError("Người được chọn không phải PM");
      }

      const project = await tx.project.create({
        data: {
          name: parsed.name,
          createdBy: user.id,
          startDate: toDateOnly(parsed.startDate),
          dueDate: toDateOnly(parsed.dueDate),
        },
      });
      await tx.projectMember.create({
        data: { projectId: project.id, userId: parsed.pmUserId },
      });

      await logActivity(
        tx,
        user.id,
        "CREATE",
        `đã tạo dự án "${project.name}"`,
        project.id,
      );
    });

    revalidatePath("/projects");
  });
}

// Thêm PM vào project đã tồn tại — chỉ Admin (PM không tự thêm PM khác vào
// project mình quản lý — CLAUDE.md §2 mục 2). Không giới hạn số project/PM.
export async function addProjectMember(input: unknown) {
  return safeAction(async () => {
    const parsed = addProjectMemberSchema.parse(input);
    const { user } = await requireUser();
    requireRole(user, ["ADMIN"]);

    const project = await db.project.findUnique({
      where: { id: parsed.projectId },
      select: { id: true, name: true },
    });
    if (!project) throw new ForbiddenError("Project không tồn tại");

    const pm = await db.user.findUnique({
      where: { id: parsed.pmUserId },
      select: { role: true, name: true },
    });
    if (!pm || pm.role !== "PM") {
      throw new ForbiddenError("Người được chọn không phải PM");
    }

    const existing = await db.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: parsed.projectId, userId: parsed.pmUserId },
      },
      select: { userId: true },
    });
    if (existing) throw new ForbiddenError("PM này đã ở trong project");

    await createMemberOrFriendlyError(
      parsed.projectId,
      parsed.pmUserId,
      "PM này đã ở trong project",
    );

    await logActivity(
      db,
      user.id,
      "CREATE",
      `đã thêm ${pm.name} làm PM cho dự án "${project.name}"`,
      project.id,
    );

    revalidatePath(`/projects/${parsed.projectId}`);
    revalidatePath("/projects");
  });
}

// Thêm Dev vào project — Admin, hoặc PM là thành viên project đó (CLAUDE.md §2).
export async function addDevToProject(input: unknown) {
  return safeAction(async () => {
    const parsed = addDevToProjectSchema.parse(input);
    const { user } = await requireUser();
    await requireProjectRole(parsed.projectId, user, ["ADMIN", "PM"]);

    const project = await db.project.findUnique({
      where: { id: parsed.projectId },
      select: { name: true },
    });
    if (!project) throw new ForbiddenError("Project không tồn tại");

    const dev = await db.user.findUnique({
      where: { id: parsed.devUserId },
      select: { role: true, name: true },
    });
    if (!dev || dev.role !== "DEV") {
      throw new ForbiddenError("Người được chọn không phải Dev");
    }

    const existing = await db.projectMember.findUnique({
      where: {
        projectId_userId: { projectId: parsed.projectId, userId: parsed.devUserId },
      },
      select: { userId: true },
    });
    if (existing) throw new ForbiddenError("Dev này đã ở trong project");

    await createMemberOrFriendlyError(
      parsed.projectId,
      parsed.devUserId,
      "Dev này đã ở trong project",
    );

    await logActivity(
      db,
      user.id,
      "CREATE",
      `đã thêm ${dev.name} làm Dev cho dự án "${project.name}"`,
      parsed.projectId,
    );

    revalidatePath(`/projects/${parsed.projectId}`);
  });
}

// Xoá Dev khỏi project — Admin, hoặc PM là thành viên project đó. Chỉ xoá được
// Dev; chặn nếu Dev còn task trong project (giữ invariant "assignee là thành viên").
export async function removeProjectMember(input: unknown) {
  return safeAction(async () => {
    const parsed = removeProjectMemberSchema.parse(input);
    const { user } = await requireUser();
    await requireProjectRole(parsed.projectId, user, ["ADMIN", "PM"]);

    // Đếm task + xoá member phải nằm trong cùng transaction, khoá row
    // ProjectMember (FOR UPDATE): createTask/updateTask cũng khoá đúng row này
    // trước khi gán task, nên không còn kẽ hở "vừa xoá Dev vừa giao task mới"
    // (write-skew) — hai phía buộc phải chạy tuần tự.
    await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ userId: string }[]>`
        SELECT "userId" FROM "ProjectMember"
        WHERE "projectId" = ${parsed.projectId} AND "userId" = ${parsed.memberUserId}
        FOR UPDATE`;
      if (locked.length === 0) {
        throw new ForbiddenError("Người này không ở trong project");
      }

      const member = await tx.user.findUnique({
        where: { id: parsed.memberUserId },
        select: { role: true, name: true },
      });
      if (!member || member.role !== "DEV") {
        throw new ForbiddenError("Chỉ xoá được Dev khỏi project");
      }

      const taskCount = await tx.task.count({
        where: { projectId: parsed.projectId, assigneeId: parsed.memberUserId },
      });
      if (taskCount > 0) {
        throw new ForbiddenError(
          `${member.name} đang được giao ${taskCount} task trong project — giao lại task cho Dev khác trước khi xoá`,
        );
      }

      await tx.projectMember.delete({
        where: {
          projectId_userId: { projectId: parsed.projectId, userId: parsed.memberUserId },
        },
      });

      const project = await tx.project.findUnique({
        where: { id: parsed.projectId },
        select: { name: true },
      });
      await logActivity(
        tx,
        user.id,
        "DELETE",
        `đã xoá Dev "${member.name}" khỏi dự án "${project?.name}"`,
        parsed.projectId,
      );
    });

    revalidatePath(`/projects/${parsed.projectId}`);
  });
}

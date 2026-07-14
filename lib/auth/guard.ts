import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type SessionUser = { id: string; role: Role };

// Ném ra khi user đã đăng nhập nhưng không đủ quyền trên tài nguyên.
// Server Action bắt lỗi này và trả { ok: false, error } cho form.
export class ForbiddenError extends Error {
  constructor(message = "Bạn không có quyền thực hiện thao tác này") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// Mọi Server Action / Route Handler bắt đầu bằng hàm này. Chưa đăng nhập → về /login.
export async function requireUser(): Promise<{ user: SessionUser }> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { user: { id: session.user.id, role: session.user.role } };
}

// Kiểm tra user có quyền trên project không. Role lấy từ session nhưng membership
// LUÔN query DB tại thời điểm gọi — không tin dữ liệu client, không tin JWT cũ.
// ADMIN đi qua mọi project; PM/DEV phải là thành viên.
export async function requireProjectRole(
  projectId: string,
  user: SessionUser,
  roles: Role[],
): Promise<void> {
  if (!roles.includes(user.role)) throw new ForbiddenError();
  if (user.role === "ADMIN") return;

  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
    select: { userId: true },
  });
  if (!member) throw new ForbiddenError();
}

// Dev chỉ thao tác trên task được giao cho chính mình.
export async function requireTaskAssignee(
  taskId: string,
  user: SessionUser,
): Promise<void> {
  const task = await db.task.findFirst({
    where: { id: taskId, assigneeId: user.id },
    select: { id: true },
  });
  if (!task) throw new ForbiddenError();
}

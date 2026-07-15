"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";

import { safeAction } from "@/lib/actions/safe-action";
import { ForbiddenError, requireRole, requireUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { createMemberSchema } from "@/lib/validation/member";

// Chỉ Admin tạo tài khoản (CLAUDE.md: không có đăng ký, tài khoản do Admin tạo).
export async function createMember(input: unknown) {
  return safeAction(async () => {
    const parsed = createMemberSchema.parse(input);
    const { user } = await requireUser();
    requireRole(user, ["ADMIN"]);

    const existing = await db.user.findUnique({
      where: { email: parsed.email },
      select: { id: true },
    });
    if (existing) throw new ForbiddenError("Email đã được sử dụng");

    await db.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        role: parsed.role,
        passwordHash: await hash(parsed.password, 12),
      },
    });

    revalidatePath("/members");
    revalidatePath("/");
  });
}

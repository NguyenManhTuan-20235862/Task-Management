"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/lib/auth";
import { loginSchema } from "@/lib/validation/auth";

export type LoginResult = { ok: true } | { ok: false; error: string };

// Action công khai duy nhất của hệ thống — không có guard vì user chưa đăng nhập.
export async function login(input: unknown): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Email hoặc mật khẩu không hợp lệ" };
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      // Sai email hay sai mật khẩu đều trả cùng một thông báo — không lộ email nào tồn tại
      return { ok: false, error: "Email hoặc mật khẩu không đúng" };
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut({ redirect: false });
}

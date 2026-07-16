import { ZodError } from "zod";

import { ForbiddenError } from "@/lib/auth/guard";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

// Bọc mọi Server Action mutation: bắt lỗi nghiệp vụ đã biết (ForbiddenError, ZodError)
// và format thống nhất về { ok: false, error }. Lỗi lạ (bug, mất kết nối DB...) được
// ném tiếp để Next.js hiện error.tsx — không nuốt lỗi không lường trước được.
export async function safeAction<T = undefined>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return (data === undefined ? { ok: true } : { ok: true, data }) as ActionResult<T>;
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: error.message };
    }
    if (error instanceof ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
    }
    throw error;
  }
}

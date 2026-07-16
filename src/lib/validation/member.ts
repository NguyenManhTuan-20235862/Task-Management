import { z } from "zod";

// Dùng chung cho form client (react-hook-form) và Server Action.
// Chỉ tạo được PM/DEV — tạo thêm Admin phải qua seed script (CLAUDE.md: tài khoản
// do Admin tạo qua UI chỉ nên là vận hành hàng ngày, không mở đường tạo quyền cao nhất).
export const createMemberSchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên").max(100, "Tên quá dài"),
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email")
    .email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  role: z.enum(["PM", "DEV"]),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;

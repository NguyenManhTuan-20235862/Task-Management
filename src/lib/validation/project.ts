import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ");

// Dùng chung cho form client (react-hook-form) và Server Action. Ngày truyền
// dạng "YYYY-MM-DD" (input type=date), giống quy ước ở lib/validation/task.ts.
export const createProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tên project")
      .max(200, "Tên quá dài"),
    pmUserId: z.string().min(1, "Vui lòng chọn PM quản lý"),
    startDate: dateString,
    dueDate: dateString,
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.dueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Ngày kết thúc phải từ ngày bắt đầu trở đi",
      });
    }
  });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// Thêm PM vào project đã tồn tại — chỉ Admin (CLAUDE.md: chỉ Admin cho PM vào project).
export const addProjectMemberSchema = z.object({
  projectId: z.string().min(1),
  pmUserId: z.string().min(1, "Vui lòng chọn PM"),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;

// Thêm Dev vào project — Admin hoặc PM quản lý project đó.
export const addDevToProjectSchema = z.object({
  projectId: z.string().min(1),
  devUserId: z.string().min(1, "Vui lòng chọn Dev"),
});

export type AddDevToProjectInput = z.infer<typeof addDevToProjectSchema>;

// Xoá Dev khỏi project — chặn ở action nếu Dev còn task (CLAUDE.md §2 mục 3).
export const removeProjectMemberSchema = z.object({
  projectId: z.string().min(1),
  memberUserId: z.string().min(1),
});

export type RemoveProjectMemberInput = z.infer<typeof removeProjectMemberSchema>;

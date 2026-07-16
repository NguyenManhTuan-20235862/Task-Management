import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ");

// Field chung của form tạo/sửa task. startDate <= dueDate check bằng superRefine
// ở schema cụ thể (CLAUDE.md §2 mục 6). Ngày truyền dạng "YYYY-MM-DD" (input
// type=date) — action tự chuyển thành Date UTC midnight khớp cột @db.Date.
const taskFields = {
  title: z.string().trim().min(1, "Vui lòng nhập tên task").max(200, "Tên quá dài"),
  description: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mô tả")
    .max(5000, "Mô tả quá dài"),
  assigneeId: z.string().min(1, "Vui lòng chọn Dev thực hiện"),
  startDate: dateString,
  dueDate: dateString,
};

function checkDateOrder(
  data: { startDate: string; dueDate: string },
  ctx: z.RefinementCtx,
) {
  if (data.startDate > data.dueDate) {
    ctx.addIssue({
      code: "custom",
      path: ["dueDate"],
      message: "Hạn chót phải từ ngày bắt đầu trở đi",
    });
  }
}

export const createTaskSchema = z
  .object({ projectId: z.string().min(1), ...taskFields })
  .superRefine(checkDateOrder);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({ taskId: z.string().min(1), ...taskFields })
  .superRefine(checkDateOrder);

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// Dùng chung cho form client (react-hook-form) và Server Action.
export const updateProgressSchema = z.object({
  taskId: z.string().min(1),
  progress: z
    .number()
    .int("Tiến độ phải là số nguyên")
    .min(0, "Tiến độ tối thiểu là 0")
    .max(100, "Tiến độ tối đa là 100"),
});

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;

export const createCommentSchema = z.object({
  taskId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập nội dung")
    .max(5000, "Nội dung quá dài"),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  commentId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập nội dung")
    .max(5000, "Nội dung quá dài"),
});

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

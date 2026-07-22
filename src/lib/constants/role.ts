import type { Role } from "@prisma/client";

// Nhãn vai trò dùng chung — trước đây lặp lại rời rạc ở members/page.tsx và
// members/[id]/page.tsx, thêm chỗ dùng thứ 3 (kết quả tìm kiếm) nên gom lại.
export const roleMeta: Record<Role, { label: string; description: string }> = {
  ADMIN: { label: "Admin", description: "Quản trị toàn bộ" },
  PM: { label: "PM", description: "Quản lý dự án" },
  DEV: { label: "Dev", description: "Lập trình viên" },
};

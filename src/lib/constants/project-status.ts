import type { TaskStatus } from "@prisma/client";

// Nhãn trạng thái riêng cho Project — dùng chung khoá TaskStatus (suy ra từ
// tổng hợp task, xem lib/queries/project-summary.ts) nhưng chữ hiển thị khác
// StatusBadge của Task ("Đang triển khai" thay vì "Đang làm"...).
export const projectStatusMeta: Record<
  TaskStatus,
  { label: string; badgeClassName: string }
> = {
  TODO: {
    label: "Chưa triển khai",
    badgeClassName: "bg-muted text-muted-foreground",
  },
  IN_PROGRESS: {
    label: "Đang triển khai",
    badgeClassName:
      "bg-[oklch(0.9_0.13_155)] text-[oklch(0.3_0.1_155)] dark:bg-[oklch(0.35_0.1_155/0.4)] dark:text-[oklch(0.85_0.15_155)]",
  },
  DONE: {
    label: "Hoàn thành",
    badgeClassName:
      "bg-[oklch(0.9_0.13_155)] text-[oklch(0.3_0.1_155)] dark:bg-[oklch(0.35_0.1_155/0.4)] dark:text-[oklch(0.85_0.15_155)]",
  },
};

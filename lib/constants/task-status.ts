import type { TaskStatus } from "@prisma/client";

// Token màu trạng thái task — dùng nhất quán toàn app (Badge, viền TaskCard, biểu đồ dashboard).
// Tái dùng biến --chart-* có sẵn trong globals.css thay vì bịa màu mới.
export const taskStatusMeta: Record<
  TaskStatus,
  { label: string; badgeClassName: string; dotClassName: string }
> = {
  TODO: {
    label: "Chưa bắt đầu",
    badgeClassName: "bg-muted text-muted-foreground",
    dotClassName: "bg-muted-foreground",
  },
  IN_PROGRESS: {
    label: "Đang làm",
    badgeClassName:
      "bg-[oklch(0.9_0.15_85)] text-[oklch(0.35_0.1_85)] dark:bg-[oklch(0.35_0.1_85/0.4)] dark:text-[oklch(0.85_0.15_85)]",
    dotClassName: "bg-[oklch(0.75_0.18_85)]",
  },
  DONE: {
    label: "Hoàn thành",
    badgeClassName:
      "bg-[oklch(0.9_0.13_155)] text-[oklch(0.3_0.1_155)] dark:bg-[oklch(0.35_0.1_155/0.4)] dark:text-[oklch(0.85_0.15_155)]",
    dotClassName: "bg-[oklch(0.7_0.16_155)]",
  },
};

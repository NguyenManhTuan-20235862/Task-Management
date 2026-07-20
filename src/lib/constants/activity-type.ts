import type { ActivityType } from "@prisma/client";

// Token màu theo loại hoạt động — cùng cách làm với taskStatusMeta (Badge dùng chung 1 nơi).
export const activityTypeMeta: Record<
  ActivityType,
  { label: string; badgeClassName: string }
> = {
  CREATE: {
    label: "Thêm",
    badgeClassName:
      "bg-[oklch(0.9_0.13_155)] text-[oklch(0.3_0.1_155)] dark:bg-[oklch(0.35_0.1_155/0.4)] dark:text-[oklch(0.85_0.15_155)]",
  },
  UPDATE: {
    label: "Cập nhật",
    badgeClassName:
      "bg-[oklch(0.9_0.1_265)] text-[oklch(0.35_0.15_265)] dark:bg-[oklch(0.35_0.12_265/0.4)] dark:text-[oklch(0.85_0.12_265)]",
  },
  COMMENT: {
    label: "Bình luận",
    badgeClassName:
      "bg-[oklch(0.9_0.08_220)] text-[oklch(0.35_0.1_220)] dark:bg-[oklch(0.35_0.1_220/0.4)] dark:text-[oklch(0.85_0.1_220)]",
  },
  DELETE: {
    label: "Xoá",
    badgeClassName: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  },
};

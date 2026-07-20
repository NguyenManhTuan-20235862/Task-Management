import type { ActivityType } from "@prisma/client";

import { db } from "@/lib/db";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

// Ghi 1 dòng audit log — gọi bằng `tx` khi action đang trong transaction (log
// tự rollback theo), gọi bằng `db` khi action không cần transaction.
// projectId optional: dùng để lọc "Hoạt động gần đây" trên trang chi tiết
// project — bỏ trống với hoạt động không gắn với project nào (vd. tạo tài khoản).
export async function logActivity(
  client: typeof db | Tx,
  actorId: string,
  type: ActivityType,
  message: string,
  projectId?: string,
) {
  await client.activityLog.create({ data: { actorId, type, message, projectId } });
}

import { z } from "zod";
import type { ActivityType, Role, TaskStatus } from "@prisma/client";

// searchParams của Next.js trả về string | string[] | undefined cho mỗi key
// (xem AdminOverview ở app/(app)/page.tsx) — flatten về string trước khi đưa vào Zod.
export type RawSearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const SEARCH_PAGE_SIZE = 10;

const PROJECT_SORTS = [
  "created_desc",
  "name_asc",
  "name_desc",
  "due_asc",
  "due_desc",
  "progress_asc",
  "progress_desc",
] as const;
const TASK_SORTS = [
  "due_asc",
  "due_desc",
  "title_asc",
  "title_desc",
  "progress_asc",
  "progress_desc",
  "created_desc",
] as const;
const MEMBER_SORTS = [
  "name_asc",
  "name_desc",
  "created_desc",
  "created_asc",
  "projects_desc",
] as const;
const ACTIVITY_SORTS = ["created_desc", "created_asc"] as const;

export type ProjectSort = (typeof PROJECT_SORTS)[number];
export type TaskSort = (typeof TASK_SORTS)[number];
export type MemberSort = (typeof MEMBER_SORTS)[number];
export type ActivitySort = (typeof ACTIVITY_SORTS)[number];

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"] as const satisfies readonly TaskStatus[];
const ROLES = ["ADMIN", "PM", "DEV"] as const satisfies readonly Role[];
const ACTIVITY_TYPES = [
  "CREATE",
  "UPDATE",
  "COMMENT",
  "DELETE",
] as const satisfies readonly ActivityType[];

// Mọi field dùng .catch() — searchParams do người dùng gõ tay trên URL nên
// không được throw lỗi 500, giá trị sai chỉ rơi về mặc định (CLAUDE.md §5).
const qField = z.string().trim().max(200).catch("");
const pageField = z.coerce.number().int().min(1).catch(1);
// Giữ nguyên dạng chuỗi "yyyy-MM-dd" (không transform sang Date neo UTC) — so
// khớp bằng matchesLocalDateRange (lib/utils.ts) ở phía query, tính theo giờ
// địa phương giống hệt ActivityBrowser/MembersBrowser (tránh lệch múi giờ VN).
const dayStringField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);
const idField = z.string().min(1).optional().catch(undefined);

const projectParamsSchema = z.object({
  type: z.literal("project"),
  q: qField,
  page: pageField,
  sort: z.enum(PROJECT_SORTS).catch("created_desc"),
  status: z.enum(TASK_STATUSES).optional().catch(undefined),
  pm: idField,
});

const taskParamsSchema = z.object({
  type: z.literal("task"),
  q: qField,
  page: pageField,
  sort: z.enum(TASK_SORTS).catch("due_asc"),
  status: z.enum(TASK_STATUSES).optional().catch(undefined),
  projectId: idField,
  assigneeId: idField,
  overdue: z
    .string()
    .optional()
    .transform((v) => v === "1"),
});

const memberParamsSchema = z.object({
  type: z.literal("member"),
  q: qField,
  page: pageField,
  sort: z.enum(MEMBER_SORTS).catch("name_asc"),
  role: z.enum(ROLES).optional().catch(undefined),
  projectId: idField,
});

const activityParamsSchema = z.object({
  type: z.literal("activity"),
  q: qField,
  page: pageField,
  sort: z.enum(ACTIVITY_SORTS).catch("created_desc"),
  activityType: z.enum(ACTIVITY_TYPES).optional().catch(undefined),
  projectId: idField,
  from: dayStringField,
  to: dayStringField,
});

export type ProjectSearchParams = z.infer<typeof projectParamsSchema>;
export type TaskSearchParams = z.infer<typeof taskParamsSchema>;
export type MemberSearchParams = z.infer<typeof memberParamsSchema>;
export type ActivitySearchParams = z.infer<typeof activityParamsSchema>;
export type ParsedSearchParams =
  | ProjectSearchParams
  | TaskSearchParams
  | MemberSearchParams
  | ActivitySearchParams;

// isAdmin: tab "activity" chỉ tồn tại với Admin — người khác tự sửa URL
// ?type=activity sẽ rơi êm về "project" thay vì lỗi 403 (đây là tuỳ chọn UI
// không tồn tại với họ, không phải tài nguyên bị từ chối truy cập).
export function parseSearchParams(
  raw: RawSearchParams,
  isAdmin: boolean,
): ParsedSearchParams {
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, first(value)]),
  );
  const rawType = flat.type;
  const type =
    rawType === "task" || rawType === "member" || (rawType === "activity" && isAdmin)
      ? rawType
      : "project";

  switch (type) {
    case "task":
      return taskParamsSchema.parse({ ...flat, type });
    case "member":
      return memberParamsSchema.parse({ ...flat, type });
    case "activity":
      return activityParamsSchema.parse({ ...flat, type });
    default:
      return projectParamsSchema.parse({ ...flat, type: "project" });
  }
}

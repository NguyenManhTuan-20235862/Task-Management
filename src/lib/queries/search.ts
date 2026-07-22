import type { TaskStatus } from "@prisma/client";

import type { SessionUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { summarizeProject, type ProjectSummary } from "@/lib/queries/project-summary";
import { matchesLocalDateRange, searchMatchScore } from "@/lib/utils";
import {
  SEARCH_PAGE_SIZE,
  type ActivitySearchParams,
  type MemberSearchParams,
  type ParsedSearchParams,
  type ProjectSearchParams,
  type TaskSearchParams,
} from "@/lib/validation/search";

export type SearchPageResult<T> = {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
};

// Trùng khớp shape với /projects, /projects/[id] (ProjectSummary + memberCount)
// để tái dùng thẳng <ProjectCard> — tránh render 2 kiểu khác nhau cho cùng 1 project.
export type ProjectSearchItem = ProjectSummary & { memberCount: number };

export type TaskSearchItem = {
  id: string;
  title: string;
  status: TaskStatus;
  progress: number;
  dueDate: Date;
  projectId: string;
  projectName: string;
  assigneeName: string;
};

export type MemberSearchItem = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PM" | "DEV";
  createdAt: Date;
  projectCount: number;
};

export type ActivitySearchItem = {
  id: string;
  type: "CREATE" | "UPDATE" | "COMMENT" | "DELETE";
  message: string;
  createdAt: Date;
  actorName: string;
  projectName: string | null;
};

// Where scope theo role — dùng đúng pattern đã có ở /projects, /projects/[id]
// (CLAUDE.md §5: scope ngay trong where, không lọc bằng JS sau khi lấy hết).
function projectScopeWhere(user: SessionUser) {
  return user.role === "ADMIN" ? {} : { members: { some: { userId: user.id } } };
}

function taskScopeWhere(user: SessionUser) {
  return user.role === "ADMIN"
    ? {}
    : { project: { members: { some: { userId: user.id } } } };
}

// "Cùng chung ít nhất 1 project với tôi" — Member không có scope riêng, suy ra
// qua ProjectMember (không có trang danh sách member cho PM/Dev, chỉ có tab
// Thành viên trong project detail, nên đây là phạm vi tương đương).
function memberScopeWhere(user: SessionUser) {
  return user.role === "ADMIN"
    ? {}
    : {
        memberships: {
          some: { project: { members: { some: { userId: user.id } } } },
        },
      };
}

// Cắt trang trên mảng đã lọc/sắp xếp xong bằng JS — dùng chung cho cả 4 loại
// kết quả tìm kiếm (thay cho skip/take ở DB, xem lý do ở đầu mỗi hàm search*).
function paginate<T>(items: T[], page: number): SearchPageResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const paged = items.slice((clampedPage - 1) * SEARCH_PAGE_SIZE, clampedPage * SEARCH_PAGE_SIZE);
  return { items: paged, page: clampedPage, totalPages, total };
}

// Sắp xếp giống nhau: nếu có từ khoá (q), độ giống nhau (score, xem searchMatchScore)
// luôn ưu tiên trước; dropdown "sort" chỉ là tiêu chí phụ khi điểm bằng nhau (hoặc
// là tiêu chí chính duy nhất khi không gõ từ khoá, vì mọi item cùng điểm 0).
function sortByRelevanceThen<T>(
  entries: { item: T; score: number }[],
  hasQuery: boolean,
  manualCompare: (a: T, b: T) => number,
): T[] {
  return entries
    .sort((a, b) => {
      if (hasQuery) {
        const diff = b.score - a.score;
        if (diff !== 0) return diff;
      }
      return manualCompare(a.item, b.item);
    })
    .map((e) => e.item);
}

// Project chưa có task -> latestDue null. Luôn đẩy xuống cuối bất kể asc/desc
// (khác việc coi null = +Infinity, vì cách đó sẽ đổi chỗ lên đầu khi đảo chiều desc).
function compareByDue(a: Date | null, b: Date | null, direction: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction * (a.getTime() - b.getTime());
}

export async function searchProjects(
  user: SessionUser,
  params: ProjectSearchParams,
): Promise<SearchPageResult<ProjectSearchItem>> {
  const where = {
    AND: [
      projectScopeWhere(user),
      user.role === "ADMIN" && params.pm
        ? { members: { some: { userId: params.pm, user: { role: "PM" as const } } } }
        : {},
    ],
  };

  // status/avgProgress là field suy ra (summarizeProject), không phải cột DB —
  // lấy tập đã scope (dữ liệu nội bộ, quy mô nhỏ, cùng lý do đã dùng ở
  // AdminOverview cho danh sách PM) rồi lọc/xếp hạng/phân trang bằng JS. Từ
  // khoá q cũng so khớp bằng JS (searchMatchScore, bỏ dấu tiếng Việt) thay vì
  // Prisma contains — contains không bỏ dấu nên "he" sẽ không tìm ra "Hệ...".
  const projectsRaw = await db.project.findMany({
    where,
    select: {
      id: true,
      name: true,
      createdAt: true,
      tasks: { select: { progress: true, status: true, dueDate: true } },
      members: {
        select: { userId: true, user: { select: { name: true, role: true } } },
      },
    },
  });

  const createdAtById = new Map(projectsRaw.map((p) => [p.id, p.createdAt]));

  let entries = projectsRaw
    .map((project) => {
      const pmMembers = project.members.filter((m) => m.user.role === "PM");
      const summary = summarizeProject({ ...project, members: pmMembers });
      const item: ProjectSearchItem = { ...summary, memberCount: project.members.length };
      return { item, score: searchMatchScore(item.name, params.q) };
    })
    .filter((e) => e.score >= 0);

  if (params.status) {
    entries = entries.filter((e) => e.item.status === params.status);
  }

  // Sort theo latestDue (hạn chót suy ra từ task) chứ không phải cột Project.dueDate
  // riêng — khớp đúng field đang hiển thị trên <ProjectCard> để tránh lệch giữa
  // tiêu chí sắp xếp và những gì người dùng nhìn thấy trên card.
  const items = sortByRelevanceThen(entries, !!params.q, (a, b) => {
    switch (params.sort) {
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "name_desc":
        return b.name.localeCompare(a.name);
      case "due_asc":
        return compareByDue(a.latestDue, b.latestDue, 1);
      case "due_desc":
        return compareByDue(a.latestDue, b.latestDue, -1);
      case "progress_asc":
        return a.avgProgress - b.avgProgress;
      case "progress_desc":
        return b.avgProgress - a.avgProgress;
      case "created_desc":
      default:
        return createdAtById.get(b.id)!.getTime() - createdAtById.get(a.id)!.getTime();
    }
  });

  return paginate(items, params.page);
}

export async function searchTasks(
  user: SessionUser,
  params: TaskSearchParams,
): Promise<SearchPageResult<TaskSearchItem>> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const where = {
    AND: [
      taskScopeWhere(user),
      params.status ? { status: params.status } : {},
      params.projectId ? { projectId: params.projectId } : {},
      params.assigneeId ? { assigneeId: params.assigneeId } : {},
      params.overdue ? { dueDate: { lt: startOfToday }, status: { not: "DONE" as const } } : {},
    ],
  };

  // Lấy hết tập đã scope+filter cứng (status/project/assignee/overdue vẫn lọc
  // ở DB vì là so khớp chính xác, không dính vấn đề dấu tiếng Việt) rồi so
  // khớp q + xếp hạng + phân trang bằng JS — cùng lý do như searchProjects.
  const tasksRaw = await db.task.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      progress: true,
      dueDate: true,
      projectId: true,
      createdAt: true,
      project: { select: { name: true } },
      assignee: { select: { name: true } },
    },
  });

  const createdAtById = new Map(tasksRaw.map((t) => [t.id, t.createdAt]));

  const entries = tasksRaw
    .map((t) => {
      const item: TaskSearchItem = {
        id: t.id,
        title: t.title,
        status: t.status,
        progress: t.progress,
        dueDate: t.dueDate,
        projectId: t.projectId,
        projectName: t.project.name,
        assigneeName: t.assignee.name,
      };
      const score = Math.max(
        searchMatchScore(t.title, params.q),
        searchMatchScore(t.description, params.q),
      );
      return { item, score };
    })
    .filter((e) => e.score >= 0);

  const items = sortByRelevanceThen(entries, !!params.q, (a, b) => {
    switch (params.sort) {
      case "due_asc":
        return a.dueDate.getTime() - b.dueDate.getTime();
      case "due_desc":
        return b.dueDate.getTime() - a.dueDate.getTime();
      case "title_asc":
        return a.title.localeCompare(b.title);
      case "title_desc":
        return b.title.localeCompare(a.title);
      case "progress_asc":
        return a.progress - b.progress;
      case "progress_desc":
        return b.progress - a.progress;
      case "created_desc":
      default:
        return createdAtById.get(b.id)!.getTime() - createdAtById.get(a.id)!.getTime();
    }
  });

  return paginate(items, params.page);
}

export async function searchMembers(
  user: SessionUser,
  params: MemberSearchParams,
): Promise<SearchPageResult<MemberSearchItem>> {
  const where = {
    AND: [
      memberScopeWhere(user),
      params.role ? { role: params.role } : {},
      params.projectId ? { memberships: { some: { projectId: params.projectId } } } : {},
    ],
  };

  const membersRaw = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { memberships: true } },
    },
  });

  const entries = membersRaw
    .map((m) => {
      const item: MemberSearchItem = {
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        createdAt: m.createdAt,
        projectCount: m._count.memberships,
      };
      const score = Math.max(
        searchMatchScore(m.name, params.q),
        searchMatchScore(m.email, params.q),
      );
      return { item, score };
    })
    .filter((e) => e.score >= 0);

  const items = sortByRelevanceThen(entries, !!params.q, (a, b) => {
    switch (params.sort) {
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "name_desc":
        return b.name.localeCompare(a.name);
      case "created_asc":
        return a.createdAt.getTime() - b.createdAt.getTime();
      case "projects_desc":
        return b.projectCount - a.projectCount;
      case "created_desc":
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  return paginate(items, params.page);
}

// Chỉ gọi khi user là Admin — parseSearchParams() đã ép type về "project" cho
// người không phải Admin nên page.tsx sẽ không bao giờ gọi hàm này cho họ.
export async function searchActivity(
  params: ActivitySearchParams,
): Promise<SearchPageResult<ActivitySearchItem>> {
  const where = {
    AND: [
      params.activityType ? { type: params.activityType } : {},
      params.projectId ? { projectId: params.projectId } : {},
    ],
  };

  // Không lọc from/to ở DB (khác trước đây) — dùng matchesLocalDateRange bằng
  // JS để chỉ nhập 1 trong 2 ô vẫn lọc đúng 1 ngày đó, tính theo giờ địa
  // phương, y hệt ActivityBrowser (tránh lệch múi giờ VN đã gặp trước đây).
  const activitiesRaw = await db.activityLog.findMany({
    where,
    select: {
      id: true,
      type: true,
      message: true,
      createdAt: true,
      actor: { select: { name: true } },
      project: { select: { name: true } },
    },
  });

  const entries = activitiesRaw
    .filter((a) => matchesLocalDateRange(a.createdAt, params.from ?? "", params.to ?? ""))
    .map((a) => {
      const item: ActivitySearchItem = {
        id: a.id,
        type: a.type,
        message: a.message,
        createdAt: a.createdAt,
        actorName: a.actor.name,
        projectName: a.project?.name ?? null,
      };
      const score = Math.max(
        searchMatchScore(a.message, params.q),
        searchMatchScore(a.actor.name, params.q),
      );
      return { item, score };
    })
    .filter((e) => e.score >= 0);

  const items = sortByRelevanceThen(entries, !!params.q, (a, b) =>
    params.sort === "created_asc"
      ? a.createdAt.getTime() - b.createdAt.getTime()
      : b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return paginate(items, params.page);
}

export type SearchFilterOptions = {
  projects: { id: string; name: string }[];
  devs: { id: string; name: string }[];
  pms: { id: string; name: string }[];
};

// Option list cho các Select filter — luôn scope theo role giống dữ liệu kết quả,
// tránh lộ tên project/dev ngoài phạm vi qua dropdown dù kết quả tìm kiếm đã ẩn.
export async function getSearchFilterOptions(
  user: SessionUser,
  type: ParsedSearchParams["type"],
): Promise<SearchFilterOptions> {
  const projectScope = projectScopeWhere(user);

  const [projects, devs, pms] = await Promise.all([
    type === "task" || type === "member" || type === "activity"
      ? db.project.findMany({
          where: projectScope,
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    type === "task"
      ? db.user.findMany({
          where:
            user.role === "ADMIN"
              ? { role: "DEV" }
              : { role: "DEV", memberships: { some: { project: projectScope } } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    type === "project" && user.role === "ADMIN"
      ? db.user.findMany({
          where: { role: "PM" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return { projects, devs, pms };
}

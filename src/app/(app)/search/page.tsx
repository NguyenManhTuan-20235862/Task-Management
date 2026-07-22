import Link from "next/link";
import { format } from "date-fns";
import { Search as SearchIcon } from "lucide-react";

import { ActivityTypeBadge } from "@/components/dashboard/activity-type-badge";
import { ProjectCard } from "@/components/project/project-card";
import { SearchCloseButton } from "@/components/search/search-close-button";
import { SearchFilterBar } from "@/components/search/search-filter-bar";
import { SearchQueryInput } from "@/components/search/search-query-input";
import { SearchSortSelect } from "@/components/search/search-sort-select";
import { SearchTabs } from "@/components/search/search-tabs";
import { StatusBadge } from "@/components/task/status-badge";
import { TaskProgress } from "@/components/task/task-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { requireUser, type SessionUser } from "@/lib/auth/guard";
import { roleMeta } from "@/lib/constants/role";
import {
  getSearchFilterOptions,
  searchActivity,
  searchMembers,
  searchProjects,
  searchTasks,
} from "@/lib/queries/search";
import {
  parseSearchParams,
  type ActivitySearchParams,
  type MemberSearchParams,
  type ParsedSearchParams,
  type ProjectSearchParams,
  type RawSearchParams,
  type TaskSearchParams,
} from "@/lib/validation/search";

const SORT_OPTIONS = {
  project: [
    { value: "created_desc", label: "Mới tạo nhất" },
    { value: "name_asc", label: "Tên A-Z" },
    { value: "name_desc", label: "Tên Z-A" },
    { value: "due_asc", label: "Hạn chót gần nhất" },
    { value: "due_desc", label: "Hạn chót xa nhất" },
    { value: "progress_desc", label: "Tiến độ cao-thấp" },
    { value: "progress_asc", label: "Tiến độ thấp-cao" },
  ],
  task: [
    { value: "due_asc", label: "Hạn chót gần nhất" },
    { value: "due_desc", label: "Hạn chót xa nhất" },
    { value: "title_asc", label: "Tên A-Z" },
    { value: "title_desc", label: "Tên Z-A" },
    { value: "progress_desc", label: "Tiến độ cao-thấp" },
    { value: "progress_asc", label: "Tiến độ thấp-cao" },
    { value: "created_desc", label: "Mới tạo nhất" },
  ],
  member: [
    { value: "name_asc", label: "Tên A-Z" },
    { value: "name_desc", label: "Tên Z-A" },
    { value: "created_desc", label: "Tham gia gần đây" },
    { value: "created_asc", label: "Tham gia lâu nhất" },
    { value: "projects_desc", label: "Nhiều project nhất" },
  ],
  activity: [
    { value: "created_desc", label: "Mới nhất" },
    { value: "created_asc", label: "Cũ nhất" },
  ],
} as const;

// Xây href phân trang từ params đã validate (không phải raw searchParams) —
// đảm bảo link luôn mang giá trị đã chuẩn hoá, không kéo theo giá trị rác
// nếu người dùng từng tự sửa URL.
function pageHref(params: ParsedSearchParams, page: number): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined || value === null || value === "" || value === false) {
      continue;
    }
    usp.set(key, String(value));
  }
  usp.set("page", String(page));
  return `/search?${usp.toString()}`;
}

function Pagination({
  params,
  page,
  totalPages,
}: {
  params: ParsedSearchParams;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
      {page > 1 ? (
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={pageHref(params, page - 1)} />}>
          Trước
        </Button>
      ) : (
        <span />
      )}
      <span className="text-xs text-muted-foreground">
        Trang {page}/{totalPages}
      </span>
      {page < totalPages ? (
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={pageHref(params, page + 1)} />}>
          Sau
        </Button>
      ) : (
        <span />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <SearchIcon className="size-8 text-muted-foreground" aria-hidden />
      <div className="grid gap-1">
        <p className="text-sm font-medium">Không tìm thấy kết quả</p>
        <p className="text-sm text-muted-foreground">
          Thử từ khoá khác hoặc bỏ bớt bộ lọc.
        </p>
      </div>
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const { user } = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const params = parseSearchParams(await searchParams, isAdmin);
  const filterOptions = await getSearchFilterOptions(user, params.type);

  return (
    <div className="grid gap-6">
      <div className="flex items-start gap-2">
        <SearchCloseButton />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tìm kiếm</h1>
          <p className="text-sm text-muted-foreground">
            {params.q ? `Kết quả cho "${params.q}"` : "Tìm dự án, task, thành viên, hoạt động"}
          </p>
        </div>
      </div>

      <SearchTabs active={params.type} q={params.q} showActivity={isAdmin} />

      <SearchQueryInput type={params.type} value={params.q} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchFilterBar params={params} filterOptions={filterOptions} isAdmin={isAdmin} />
        <SearchSortSelect value={params.sort} options={[...SORT_OPTIONS[params.type]]} />
      </div>

      {params.type === "project" && <ProjectResults params={params} user={user} />}
      {params.type === "task" && <TaskResults params={params} user={user} />}
      {params.type === "member" && (
        <MemberResults params={params} user={user} isAdmin={isAdmin} />
      )}
      {params.type === "activity" && <ActivityResults params={params} />}
    </div>
  );
}

async function ProjectResults({
  params,
  user,
}: {
  params: ProjectSearchParams;
  user: SessionUser;
}) {
  const result = await searchProjects(user, params);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{result.total} dự án</p>
      {result.items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {result.items.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                memberCount={project.memberCount}
                tone={i}
              />
            ))}
          </div>
          <Pagination params={params} page={result.page} totalPages={result.totalPages} />
        </>
      )}
    </div>
  );
}

async function TaskResults({
  params,
  user,
}: {
  params: TaskSearchParams;
  user: SessionUser;
}) {
  const result = await searchTasks(user, params);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{result.total} task</p>
      {result.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Task</th>
                <th className="px-4 py-2.5 font-medium">Dự án</th>
                <th className="px-4 py-2.5 font-medium">Người thực hiện</th>
                <th className="px-4 py-2.5 font-medium">Tiến độ</th>
                <th className="px-4 py-2.5 font-medium">Hạn chót</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.items.map((task) => (
                <tr key={task.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/tasks/${task.id}`} className="hover:underline underline-offset-4">
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{task.projectName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={task.assigneeName} size="sm" />
                      <span className="text-muted-foreground">{task.assigneeName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TaskProgress value={task.progress} className="w-28" />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {format(task.dueDate, "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination params={params} page={result.page} totalPages={result.totalPages} />
        </div>
      )}
    </div>
  );
}

async function MemberResults({
  params,
  user,
  isAdmin,
}: {
  params: MemberSearchParams;
  user: SessionUser;
  isAdmin: boolean;
}) {
  const result = await searchMembers(user, params);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{result.total} thành viên</p>
      {result.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Thành viên</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Vai trò</th>
                <th className="px-4 py-2.5 font-medium">Dự án</th>
                <th className="px-4 py-2.5 font-medium">Ngày tham gia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.items.map((member) => {
                const row = (
                  <div className="flex items-center gap-2.5">
                    <UserAvatar name={member.name} size="sm" />
                    <div className="grid gap-0">
                      <span
                        className={
                          isAdmin && member.role !== "ADMIN"
                            ? "font-medium hover:underline underline-offset-4"
                            : "font-medium"
                        }
                      >
                        {member.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {roleMeta[member.role].description}
                      </span>
                    </div>
                  </div>
                );
                return (
                  <tr key={member.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      {/* /members/[id] chỉ Admin xem được — PM/Dev thấy dòng nhưng không phải link */}
                      {isAdmin && member.role !== "ADMIN" ? (
                        <Link href={`/members/${member.id}`}>{row}</Link>
                      ) : (
                        row
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{roleMeta[member.role].label}</Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {member.role === "ADMIN" ? "Tất cả" : member.projectCount}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {format(member.createdAt, "dd/MM/yyyy")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination params={params} page={result.page} totalPages={result.totalPages} />
        </div>
      )}
    </div>
  );
}

async function ActivityResults({
  params,
}: {
  params: ActivitySearchParams;
}) {
  const result = await searchActivity(params);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{result.total} hoạt động</p>
      {result.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Thời gian</th>
                <th className="px-4 py-2.5 font-medium">Người thực hiện</th>
                <th className="px-4 py-2.5 font-medium">Loại</th>
                <th className="px-4 py-2.5 font-medium">Nội dung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.items.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap text-muted-foreground">
                    {format(activity.createdAt, "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{activity.actorName}</td>
                  <td className="px-4 py-3">
                    <ActivityTypeBadge type={activity.type} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{activity.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination params={params} page={result.page} totalPages={result.totalPages} />
        </div>
      )}
    </div>
  );
}

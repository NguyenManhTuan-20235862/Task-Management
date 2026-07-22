"use client";

import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterSelect, FILTER_ALL as ALL } from "@/components/search/filter-select";
import { useUpdateSearchParams } from "@/components/search/use-search-url";
import { activityTypeMeta } from "@/lib/constants/activity-type";
import { taskStatusMeta } from "@/lib/constants/task-status";
import type { SearchFilterOptions } from "@/lib/queries/search";
import type { ParsedSearchParams } from "@/lib/validation/search";

const statusOptions = (["TODO", "IN_PROGRESS", "DONE"] as const).map((s) => ({
  value: s,
  label: taskStatusMeta[s].label,
}));

const activityTypeOptions = (["CREATE", "UPDATE", "COMMENT", "DELETE"] as const).map(
  (t) => ({ value: t, label: activityTypeMeta[t].label }),
);

export function SearchFilterBar({
  params,
  filterOptions,
  isAdmin,
}: {
  params: ParsedSearchParams;
  filterOptions: SearchFilterOptions;
  isAdmin: boolean;
}) {
  const update = useUpdateSearchParams();
  const projectItems = filterOptions.projects.map((p) => ({ value: p.id, label: p.name }));

  if (params.type === "project") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={params.status ?? ALL}
          allLabel="Tất cả trạng thái"
          options={statusOptions}
          onChange={(v) => update({ status: v })}
        />
        {isAdmin && (
          <FilterSelect
            value={params.pm ?? ALL}
            allLabel="Tất cả PM"
            options={filterOptions.pms.map((pm) => ({ value: pm.id, label: pm.name }))}
            onChange={(v) => update({ pm: v })}
          />
        )}
      </div>
    );
  }

  if (params.type === "task") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={params.status ?? ALL}
          allLabel="Tất cả trạng thái"
          options={statusOptions}
          onChange={(v) => update({ status: v })}
        />
        <FilterSelect
          value={params.projectId ?? ALL}
          allLabel="Tất cả dự án"
          options={projectItems}
          onChange={(v) => update({ projectId: v })}
        />
        <FilterSelect
          value={params.assigneeId ?? ALL}
          allLabel="Tất cả Dev"
          options={filterOptions.devs.map((d) => ({ value: d.id, label: d.name }))}
          onChange={(v) => update({ assigneeId: v })}
        />
        <Button
          type="button"
          variant={params.overdue ? "default" : "outline"}
          size="sm"
          onClick={() => update({ overdue: params.overdue ? null : "1" })}
        >
          Quá hạn
        </Button>
      </div>
    );
  }

  if (params.type === "member") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={params.role ?? ALL}
          allLabel="Tất cả vai trò"
          options={
            isAdmin
              ? [
                  { value: "ADMIN", label: "Admin" },
                  { value: "PM", label: "PM" },
                  { value: "DEV", label: "Dev" },
                ]
              : [
                  { value: "PM", label: "PM" },
                  { value: "DEV", label: "Dev" },
                ]
          }
          onChange={(v) => update({ role: v })}
        />
        <FilterSelect
          value={params.projectId ?? ALL}
          allLabel="Tất cả dự án"
          options={projectItems}
          onChange={(v) => update({ projectId: v })}
        />
      </div>
    );
  }

  // activity — chỉ Admin thấy tab này (page.tsx đã ẩn/fallback cho role khác)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        value={params.activityType ?? ALL}
        allLabel="Tất cả loại"
        options={activityTypeOptions}
        onChange={(v) => update({ activityType: v })}
      />
      <FilterSelect
        value={params.projectId ?? ALL}
        allLabel="Tất cả dự án"
        options={projectItems}
        onChange={(v) => update({ projectId: v })}
      />
      <Input
        type="date"
        aria-label="Từ ngày"
        className="h-7 w-fit text-[0.8rem]"
        value={params.from ?? ""}
        onChange={(e) => update({ from: e.target.value || null })}
      />
      <Input
        type="date"
        aria-label="Đến ngày"
        className="h-7 w-fit text-[0.8rem]"
        value={params.to ?? ""}
        onChange={(e) => update({ to: e.target.value || null })}
      />
      {(params.from || params.to) && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Xoá bộ lọc thời gian"
          onClick={() => update({ from: null, to: null })}
        >
          <X aria-hidden />
        </Button>
      )}
    </div>
  );
}

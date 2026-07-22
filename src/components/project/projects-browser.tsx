"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { CreateProjectDialog } from "@/components/project/create-project-dialog";
import { ProjectCard } from "@/components/project/project-card";
import { FilterSelect } from "@/components/search/filter-select";
import { Input } from "@/components/ui/input";
import { taskStatusMeta } from "@/lib/constants/task-status";
import type { ProjectSummary } from "@/lib/queries/project-summary";
import { searchMatchScore } from "@/lib/utils";

type ProjectItem = ProjectSummary & { memberCount: number };
type PmOption = { id: string; name: string; projectCount: number };

const statusOptions = (["TODO", "IN_PROGRESS", "DONE"] as const).map((s) => ({
  value: s,
  label: taskStatusMeta[s].label,
}));

// Lọc tại chỗ (client-side) trên tập project Admin đã thấy sẵn — không đổi URL,
// không gọi lại server. Chỉ dùng cho Admin; PM/Dev vẫn render grid tĩnh như cũ
// ở projects/page.tsx (xem CLAUDE.md "Không đổi" trong plan tính năng này).
export function ProjectsBrowser({
  projects,
  pmOptions,
}: {
  projects: ProjectItem[];
  pmOptions: PmOption[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  // Điểm càng cao = càng giống từ khoá (khớp chính xác > đầu chuỗi > đầu từ >
  // giữa chuỗi), không phân biệt dấu tiếng Việt — xem searchMatchScore. Không
  // khớp (-1) bị loại; còn lại sắp xếp giống nhất lên đầu.
  const filtered = projects
    .map((project) => ({ project, score: searchMatchScore(project.name, query) }))
    .filter(({ score }) => score >= 0)
    .filter(({ project }) => status === "all" || project.status === status)
    .sort((a, b) => b.score - a.score)
    .map(({ project }) => project);

  if (projects.length === 0) {
    return (
      <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <Plus className="size-8 text-muted-foreground" aria-hidden />
        <div className="grid gap-1">
          <p className="text-sm font-medium">Chưa có project nào</p>
          <p className="text-sm text-muted-foreground">
            Bấm &quot;Tạo project&quot; để bắt đầu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm dự án..."
            className="pl-8"
            aria-label="Tìm dự án"
          />
        </div>
        <FilterSelect
          value={status}
          allLabel="Tất cả trạng thái"
          options={statusOptions}
          onChange={(v) => setStatus(v ?? "all")}
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Không tìm thấy dự án nào khớp. Thử từ khoá khác hoặc bỏ bớt bộ lọc.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((project, i) => (
          <ProjectCard
            key={project.id}
            project={project}
            memberCount={project.memberCount}
            tone={i}
          />
        ))}
        <CreateProjectDialog
          pmOptions={pmOptions}
          trigger={
            <button
              type="button"
              className="grid min-h-48 place-items-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <span className="flex size-9 items-center justify-center rounded-full border border-dashed border-current">
                <Plus className="size-4" aria-hidden />
              </span>
              Tạo dự án mới
            </button>
          }
        />
      </div>
    </div>
  );
}

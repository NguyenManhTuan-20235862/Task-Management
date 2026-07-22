"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Search, X } from "lucide-react";
import type { ActivityType } from "@prisma/client";

import { ActivityTypeBadge } from "@/components/dashboard/activity-type-badge";
import { FilterSelect } from "@/components/search/filter-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activityTypeMeta } from "@/lib/constants/activity-type";
import { matchesLocalDateRange, searchMatchScore } from "@/lib/utils";

type ActivityItem = {
  id: string;
  type: ActivityType;
  message: string;
  createdAt: Date;
  actor: { name: string };
};

const activityTypeOptions = (["CREATE", "UPDATE", "COMMENT", "DELETE"] as const).map(
  (t) => ({ value: t, label: activityTypeMeta[t].label }),
);

// Live-filter tại chỗ trên đúng 30 hoạt động gần nhất đã tải sẵn (không mở rộng
// ra toàn bộ lịch sử — việc đó thuộc tab Hoạt động ở /search). Gõ tới đâu lọc
// tới đó, không debounce vì dữ liệu nhỏ, lọc trong JS tức thời.
export function ActivityBrowser({ activities }: { activities: ActivityItem[] }) {
  const [query, setQuery] = useState("");
  const [activityType, setActivityType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Điểm giống nhau lấy max(nội dung, tên người thực hiện) — có từ khoá thì
  // xếp giống nhất lên đầu, không phân biệt dấu tiếng Việt (searchMatchScore).
  const filtered = activities
    .map((a) => ({
      activity: a,
      score: Math.max(searchMatchScore(a.message, query), searchMatchScore(a.actor.name, query)),
    }))
    .filter(({ score }) => score >= 0)
    .filter(({ activity }) => activityType === "all" || activity.type === activityType)
    .filter(({ activity }) => matchesLocalDateRange(activity.createdAt, from, to))
    .sort((a, b) => b.score - a.score)
    .map(({ activity }) => activity);

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
            placeholder="Tìm trong hoạt động..."
            className="pl-8"
            aria-label="Tìm hoạt động"
          />
        </div>
        <FilterSelect
          value={activityType}
          allLabel="Tất cả loại"
          options={activityTypeOptions}
          onChange={(v) => setActivityType(v ?? "all")}
        />
        <Input
          type="date"
          aria-label="Từ ngày"
          className="h-8 w-fit"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          type="date"
          aria-label="Đến ngày"
          className="h-8 w-fit"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        {(from || to) && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Xoá bộ lọc thời gian"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            <X aria-hidden />
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Không tìm thấy hoạt động nào khớp. Thử từ khoá khác hoặc bỏ bớt bộ lọc.
        </p>
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
              {filtered.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-4 py-3 tabular-nums whitespace-nowrap text-muted-foreground">
                    {format(activity.createdAt, "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {activity.actor.name}
                  </td>
                  <td className="px-4 py-3">
                    <ActivityTypeBadge type={activity.type} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{activity.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

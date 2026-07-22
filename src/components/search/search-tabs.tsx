import Link from "next/link";

import { Button } from "@/components/ui/button";

const TABS = [
  { type: "project", label: "Dự án" },
  { type: "task", label: "Task" },
  { type: "member", label: "Thành viên" },
  { type: "activity", label: "Hoạt động" },
] as const;

// Server Component thuần — chỉ điều hướng bằng Link, không cần state client.
// Đổi tab reset toàn bộ filter/sort/page riêng của tab cũ, chỉ giữ lại q.
export function SearchTabs({
  active,
  q,
  showActivity,
}: {
  active: string;
  q: string;
  showActivity: boolean;
}) {
  const tabs = TABS.filter((tab) => tab.type !== "activity" || showActivity);

  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <Button
          key={tab.type}
          variant={tab.type === active ? "default" : "outline"}
          size="sm"
          nativeButton={false}
          render={
            <Link
              href={`/search?type=${tab.type}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            />
          }
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}

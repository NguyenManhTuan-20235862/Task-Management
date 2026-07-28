"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { value: "members", label: "Thành viên" },
  { value: "tasks", label: "Task" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export function ProjectDetailTabs({
  membersContent,
  tasksContent,
}: {
  membersContent: React.ReactNode;
  tasksContent: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Tab đang chọn nằm trong URL (không phải useState nội bộ) — để khi vào
  // task detail rồi bấm quay lại (router.back(), xem TaskBackLink), trình
  // duyệt khôi phục đúng URL cũ (còn nguyên ?tab=) thay vì reset về mặc định,
  // vì component đã bị unmount hoàn toàn nên useState không giữ được.
  const tab: TabValue = searchParams.get("tab") === "tasks" ? "tasks" : "members";

  function setTab(next: TabValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "members") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    // replace (không phải push) — đổi tab nhiều lần không tạo thêm lịch sử,
    // để router.back() từ task detail luôn về đúng 1 bước, không bị kẹt ở
    // trạng thái tab trung gian.
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="grid gap-6">
      <div className="flex w-fit items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              tab === t.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={tab === "members" ? "grid gap-6" : "hidden"}>
        {membersContent}
      </div>
      <div className={tab === "tasks" ? "grid gap-4" : "hidden"}>
        {tasksContent}
      </div>
    </div>
  );
}

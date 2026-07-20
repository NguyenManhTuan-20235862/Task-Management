"use client";

import { useState } from "react";

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
  const [tab, setTab] = useState<TabValue>("members");

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

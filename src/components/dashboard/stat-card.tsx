import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const toneClasses = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-[oklch(0.9_0.13_155)] text-[oklch(0.3_0.1_155)] dark:bg-[oklch(0.35_0.1_155/0.4)] dark:text-[oklch(0.85_0.15_155)]",
  amber: "bg-[oklch(0.9_0.15_85)] text-[oklch(0.35_0.1_85)] dark:bg-[oklch(0.35_0.1_85/0.4)] dark:text-[oklch(0.85_0.15_85)]",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function StatCard({
  icon: Icon,
  value,
  label,
  sublabel,
  tone,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  sublabel: string;
  tone: keyof typeof toneClasses;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-border p-4">
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          toneClasses[tone],
        )}
      >
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div className="grid gap-0.5">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

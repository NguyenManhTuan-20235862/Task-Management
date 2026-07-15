import type { TaskStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { taskStatusMeta } from "@/lib/constants/task-status";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: TaskStatus }) {
  const meta = taskStatusMeta[status];
  return (
    <Badge className={cn("border-0", meta.badgeClassName)}>
      <span className={cn("size-1.5 rounded-full", meta.dotClassName)} />
      {meta.label}
    </Badge>
  );
}

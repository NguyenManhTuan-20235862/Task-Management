import type { TaskStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { projectStatusMeta } from "@/lib/constants/project-status";
import { cn } from "@/lib/utils";

export function ProjectStatusBadge({ status }: { status: TaskStatus }) {
  const meta = projectStatusMeta[status];
  return <Badge className={cn("border-0", meta.badgeClassName)}>{meta.label}</Badge>;
}

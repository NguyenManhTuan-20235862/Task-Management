import type { ActivityType } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { activityTypeMeta } from "@/lib/constants/activity-type";
import { cn } from "@/lib/utils";

export function ActivityTypeBadge({ type }: { type: ActivityType }) {
  const meta = activityTypeMeta[type];
  return <Badge className={cn("border-0", meta.badgeClassName)}>{meta.label}</Badge>;
}

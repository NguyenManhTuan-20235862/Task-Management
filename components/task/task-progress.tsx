import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function TaskProgress({
  value,
  className,
  showValue = true,
}: {
  value: number;
  className?: string;
  showValue?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Progress value={value} className="flex-1">
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
      {showValue && (
        <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
          {value}%
        </span>
      )}
    </div>
  );
}

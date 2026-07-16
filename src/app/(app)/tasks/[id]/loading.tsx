import { Skeleton } from "@/components/ui/skeleton";

export default function TaskDetailLoading() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center gap-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-full" />
      </div>
      <div className="grid gap-4">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-3">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

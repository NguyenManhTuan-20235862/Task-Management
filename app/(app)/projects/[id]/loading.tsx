import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDetailLoading() {
  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <Skeleton className="h-4 w-20" />
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full max-w-sm rounded-full" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      <div className="grid gap-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>

      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

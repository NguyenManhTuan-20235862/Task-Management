import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDetailLoading() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-20" />
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-40" />
        </div>

        <Skeleton className="h-24 w-full rounded-xl sm:w-96" />
      </div>

      <Skeleton className="h-9 w-48 rounded-full" />

      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

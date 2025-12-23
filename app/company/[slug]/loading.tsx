import { Skeleton } from "@/components/layout/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="mt-3 h-4 w-80" />
      <Skeleton className="mt-2 h-4 w-64" />

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>

      <div className="mt-6 grid gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </main>
  );
}



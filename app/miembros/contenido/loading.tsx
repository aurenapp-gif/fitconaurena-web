import { PageShell, SkeletonCard } from "@/components/Skeletons";

export default function Loading() {
  return (
    <PageShell wide>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </PageShell>
  );
}

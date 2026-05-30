import { PageShell, Block } from "@/components/Skeletons";

export default function Loading() {
  return (
    <PageShell wide>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Block key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Block className="h-64 w-full" />
        <Block className="h-64 w-full" />
      </div>
    </PageShell>
  );
}

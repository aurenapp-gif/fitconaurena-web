import { PageShell, Block, Bar } from "@/components/Skeletons";

export default function Loading() {
  return (
    <PageShell wide>
      <Block className="h-32 w-full mb-6" />
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Block className="h-72 w-full" />
        <Block className="h-72 w-full" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card-dark p-5 !transform-none">
            <Bar className="h-4 w-24 mb-3" />
            <Bar className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}

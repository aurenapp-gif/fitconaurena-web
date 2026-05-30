import { PageShell, Block } from "@/components/Skeletons";

export default function Loading() {
  return (
    <PageShell wide>
      <Block className="h-32 w-full mb-6" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Block key={i} className="h-16 w-full" />
        ))}
      </div>
    </PageShell>
  );
}

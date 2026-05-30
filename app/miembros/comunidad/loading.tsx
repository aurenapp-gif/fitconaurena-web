import { PageShell, Block } from "@/components/Skeletons";

export default function Loading() {
  return (
    <PageShell>
      <Block className="h-28 w-full mb-6" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Block key={i} className="h-24 w-full" />
        ))}
      </div>
    </PageShell>
  );
}

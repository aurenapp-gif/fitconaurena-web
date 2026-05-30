import { PageShell, Block } from "@/components/Skeletons";

export default function Loading() {
  return (
    <PageShell>
      <Block className="h-40 w-full mb-8" />
      <Block className="h-96 w-full" />
    </PageShell>
  );
}

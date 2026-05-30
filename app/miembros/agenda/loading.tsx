import { PageShell, Block } from "@/components/Skeletons";

export default function Loading() {
  return (
    <PageShell>
      <Block className="h-44 w-full mb-6" />
      <Block className="h-24 w-full" />
    </PageShell>
  );
}

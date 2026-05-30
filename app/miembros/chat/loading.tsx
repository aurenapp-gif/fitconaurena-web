import { PageShell, Block } from "@/components/Skeletons";

export default function Loading() {
  return (
    <PageShell>
      <Block className="w-full" style={{ height: "65vh", minHeight: 420 }} />
    </PageShell>
  );
}

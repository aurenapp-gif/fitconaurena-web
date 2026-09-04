import AppShell from "@/components/AppShell";

export default function Loading() {
  return (
    <>
      <AppShell />
      <main className="app-main relative min-h-screen">
        <div className="container-wide relative z-10 py-16">
          <div className="h-4 w-32 rounded bg-surface-2 mb-3 animate-pulse" />
          <div className="h-8 w-56 rounded bg-surface-2 mb-10 animate-pulse" />
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-dark p-6 !transform-none">
                <div className="h-5 w-40 rounded bg-surface-2 mb-3 animate-pulse" />
                <div className="h-3 w-full rounded bg-surface-2 mb-2 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-surface-2 mb-5 animate-pulse" />
                <div className="h-9 w-32 rounded-xl bg-surface-2 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

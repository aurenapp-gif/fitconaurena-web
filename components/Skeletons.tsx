/* Bloques de esqueleto reutilizables para los estados de carga (loading.tsx).
 * Solo presentacional, sin estado: da feedback visual instantáneo al navegar. */
import Navbar from "@/components/Navbar";

export function Bar({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div style={style} className={`rounded bg-[#161616] animate-pulse ${className}`} />;
}
export function Block({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div style={style} className={`rounded-xl bg-[#1c1c1c] animate-pulse ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card-dark p-6 !transform-none">
      <Bar className="h-5 w-40 mb-3" />
      <Bar className="h-3 w-full mb-2" />
      <Bar className="h-3 w-2/3 mb-5" />
      <Block className="h-9 w-32" />
    </div>
  );
}

/** Carcasa de página: Navbar + cabecera (tag + título) + contenido. */
export function PageShell({
  wide = false,
  children,
}: {
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className={`${wide ? "container-wide" : "container-content"} relative z-10 py-16`}>
          <Bar className="h-4 w-32 mb-3" />
          <Bar className="h-8 w-56 mb-10" />
          {children}
        </div>
      </main>
    </>
  );
}

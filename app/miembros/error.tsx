"use client";

import AppShell from "@/components/AppShell";

/* Red de seguridad del área de miembros: si una página de /miembros lanza un
 * error inesperado, se muestra esto (con la navegación) en vez de romperse. */
export default function MiembrosError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <AppShell />
      <main className="app-main relative min-h-screen flex items-center justify-center">
        <div className="text-center px-6">
          <h1 className="section-title mb-3">No se pudo cargar</h1>
          <p className="section-sub max-w-md mx-auto mb-8">
            Ha ocurrido un error temporal al cargar tu área. Vuelve a intentarlo en unos segundos.
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button onClick={() => reset()} className="btn-brand text-base px-8 py-4">Reintentar</button>
            <a href="/miembros" className="btn-outline text-base px-8 py-4">Volver a mi área</a>
          </div>
        </div>
      </main>
    </>
  );
}

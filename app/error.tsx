"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="font-black text-lg mb-6 text-white">
        fit<span className="text-[#CAFF00]">con</span>aurena
      </p>
      <h1 className="section-title mb-3">Algo ha ido mal</h1>
      <p className="section-sub max-w-md mx-auto mb-8">
        Ha ocurrido un error temporal. Vuelve a intentarlo; si persiste, recarga en unos segundos.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <button onClick={() => reset()} className="btn-brand text-base px-8 py-4">
          Reintentar
        </button>
        <a href="/" className="btn-outline text-base px-8 py-4">
          Ir al inicio
        </a>
      </div>
    </div>
  );
}

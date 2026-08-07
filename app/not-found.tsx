import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <p className="font-black text-lg mb-6 text-white">
        Programa <span className="text-[#1CA0E3]">FITCON</span>
      </p>
      <h1 className="section-title mb-3">Página no encontrada</h1>
      <p className="section-sub max-w-md mx-auto mb-8">
        La página que buscas no existe o se ha movido.
      </p>
      <Link href="/" className="btn-brand text-base px-8 py-4">
        Ir al inicio
      </Link>
    </div>
  );
}

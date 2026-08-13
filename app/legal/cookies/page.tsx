import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = { title: "Política de cookies" };

export default function CookiesPage() {
  return (
    <LegalLayout title="Política de cookies" updated="13 de agosto de 2026">
      <p>
        Esta plataforma solo utiliza cookies estrictamente necesarias para
        prestar el servicio. No usamos cookies de publicidad, seguimiento
        publicitario ni analítica de terceros, así que no se requiere
        consentimiento previo para su instalación.
      </p>

      <h2 className="text-white font-bold text-base mt-4">Cookies utilizadas</h2>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>
          <strong className="text-white">Cookie de sesión de miembros.</strong>{" "}
          Cookie propia, técnica y esencial: mantiene la sesión iniciada tras el acceso
          por email. Sin ella no puedes usar el área privada. Se elimina al cerrar sesión
          y caduca automáticamente pasado el tiempo de vida configurado.
        </li>
      </ul>

      <h2 className="text-white font-bold text-base mt-4">Notificaciones push (opcionales)</h2>
      <p>
        Si activas las notificaciones desde tu perfil, tu navegador guarda una
        suscripción para poder enviártelas (recordatorios de check-in, aviso de
        plan disponible, comunicados). Puedes desactivarlas en cualquier momento
        desde la configuración del navegador o del sistema.
      </p>

      <h2 className="text-white font-bold text-base mt-4">Servicios de terceros</h2>
      <p>
        La plataforma se apoya en Vercel (alojamiento) y Supabase (base de
        datos y almacenamiento). Ninguno de ellos coloca cookies en tu
        dispositivo con fines de seguimiento, publicidad o creación de perfiles.
        Puedes consultar sus políticas de privacidad en sus sitios web.
      </p>

      <h2 className="text-white font-bold text-base mt-4">Actualización</h2>
      <p>
        Si en el futuro incorporásemos cookies no esenciales (por ejemplo,
        analítica), se requerirá tu consentimiento previo mediante un banner
        antes de instalarlas.
      </p>
    </LegalLayout>
  );
}

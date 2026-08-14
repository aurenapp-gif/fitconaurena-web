import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";
import { COMPANY, companyLine } from "@/lib/company";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacidadPage() {
  return (
    <LegalLayout title="Política de privacidad" updated="13 de agosto de 2026">
      <h2 className="text-white font-bold text-base">1. Responsable del tratamiento</h2>
      <p>{companyLine()}. Contacto: {COMPANY.email}.</p>

      <h2 className="text-white font-bold text-base mt-4">2. Datos que tratamos</h2>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>Identificación y contacto: nombre, apellidos, email, foto de perfil, dirección de residencia y código postal (necesarios para el contrato y para poder notificarte en caso de gestiones administrativas o legales).</li>
        <li>Cuestionario inicial: edad, altura, objetivos, hábitos y estado de salud declarado.</li>
        <li>Seguimiento: check-ins (peso, medidas, fotos de progreso, notas) y hábitos diarios.</li>
        <li>Documentos: planes de nutrición y entrenamiento, vídeos de técnica y contrato firmado.</li>
        <li>Uso de la plataforma: accesos, apertura de documentos y actividad, para acreditar la prestación del servicio.</li>
      </ul>

      <h2 className="text-white font-bold text-base mt-4">3. Finalidad y base jurídica</h2>
      <p>Los datos se tratan con la única finalidad de prestar el servicio de asesoramiento contratado y hacer tu seguimiento. La base jurídica es la ejecución del contrato (art. 6.1.b RGPD). Los datos de salud declarados se tratan con tu consentimiento expreso (art. 9.2.a RGPD).</p>

      <h2 className="text-white font-bold text-base mt-4">4. Encargados del tratamiento</h2>
      <p>Prestadores necesarios para que la plataforma funcione: alojamiento y base de datos (Vercel, Supabase), envío de emails (Resend), notificaciones push, y CRM de altas (MailerLite). No se ceden datos con fines comerciales ni a terceros ajenos al servicio.</p>

      <h2 className="text-white font-bold text-base mt-4">5. Fotos de progreso</h2>
      <p>Tus fotos son privadas: solo las ve tu coach. Nunca se publican ni se comparten sin tu autorización expresa y por escrito.</p>

      <h2 className="text-white font-bold text-base mt-4">6. Conservación</h2>
      <p>Mantenemos tus datos mientras estés dada de alta y, tras la baja, durante los plazos legales aplicables (contables, fiscales y de posibles reclamaciones).</p>

      <h2 className="text-white font-bold text-base mt-4">7. Derechos</h2>
      <p>Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a {COMPANY.email}. También puedes reclamar ante la Comissão Nacional de Proteção de Dados (Portugal) o, si resides en España, ante la Agencia Española de Protección de Datos.</p>
    </LegalLayout>
  );
}

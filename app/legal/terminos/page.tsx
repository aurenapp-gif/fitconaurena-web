import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";
import { COMPANY, companyLine } from "@/lib/company";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function TerminosPage() {
  return (
    <LegalLayout title="Términos y condiciones" updated="13 de agosto de 2026">
      <h2 className="text-white font-bold text-base">1. Prestador del servicio</h2>
      <p>{companyLine()}. Contacto: {COMPANY.email}. En adelante, &quot;la coach&quot;.</p>

      <h2 className="text-white font-bold text-base mt-4">2. Objeto</h2>
      <p>El servicio consiste en asesoramiento personalizado de nutrición y entrenamiento, con seguimiento continuado a través de esta plataforma. La coach diseña y entrega una planificación personalizada tras el cuestionario inicial y realiza el seguimiento durante el ciclo contratado.</p>

      <h2 className="text-white font-bold text-base mt-4">3. Contenidos personales e intransferibles</h2>
      <p>Los planes, materiales y contenidos que recibas son personales e intransferibles: no pueden compartirse, revenderse ni difundirse.</p>

      <h2 className="text-white font-bold text-base mt-4">4. No sustituye al consejo médico</h2>
      <p>El asesoramiento no sustituye al consejo médico. Debes informar de cualquier condición de salud, lesión o tratamiento, y consultar con un profesional sanitario antes de empezar.</p>

      <h2 className="text-white font-bold text-base mt-4">4.bis Responsabilidad y uso adecuado</h2>
      <p>La planificación se elabora en función de la información aportada por la clienta en el cuestionario inicial y de las indicaciones que la coach le traslada. La coach no se hace responsable de los daños, lesiones o resultados adversos derivados de una ejecución incorrecta, la modificación unilateral de las pautas, la omisión de información relevante sobre el estado de salud, o del uso del plan sin la supervisión y el seguimiento profesionales previstos en el servicio.</p>
      <p>La clienta se compromete a comunicar cualquier síntoma, molestia o cambio relevante y a no alterar la planificación por su cuenta sin consultarlo previamente.</p>

      <h2 className="text-white font-bold text-base mt-4">5. Confidencialidad e imagen</h2>
      <p>Las llamadas grupales, los materiales y las comunicaciones con tu coach son confidenciales: no pueden grabarse, reproducirse ni difundirse, ni total ni parcialmente, en redes sociales ni en ningún otro medio. En las llamadas participan otras clientas y su privacidad también debe protegerse.</p>
      <p>Te comprometes a no crear, publicar ni difundir —en vídeo, audio, imagen o texto, y en cualquier red social o plataforma (TikTok, Instagram, YouTube, X, foros, grupos de mensajería o cualquier otra)— contenido difamatorio, injurioso o calumnioso sobre la coach, su equipo, su empresa o el servicio, ni afirmaciones falsas, engañosas o sacadas de contexto que puedan dañar su reputación o su actividad profesional.</p>
      <p>Si en algún momento no estás conforme con el servicio, te comprometes a comunicárselo primero a tu coach por el canal directo, para darle la oportunidad de resolverlo antes de difundirlo públicamente.</p>
      <p>El nombre, la marca, la imagen, la voz y los contenidos de la coach están protegidos: no pueden utilizarse con fines comerciales o promocionales, ni incorporarse a publicaciones propias, sin su autorización previa y por escrito.</p>
      <p>El incumplimiento de estos puntos puede conllevar la baja inmediata del programa, sin perjuicio de las acciones legales que correspondan.</p>

      <h2 className="text-white font-bold text-base mt-4">6. Inicio inmediato y desistimiento</h2>
      <p>Al aceptar estas condiciones, solicitas expresamente que la prestación del servicio comience de forma inmediata, sin esperar a que transcurra el plazo de desistimiento de 14 días naturales.</p>
      <p>Reconoces que la prestación principal del servicio consiste en el diseño y la entrega de la planificación personalizada (nutrición y/o entrenamiento) a partir de la información aportada en el cuestionario inicial, y que la coach comienza a preparar dicha planificación desde el mismo momento de tu aceptación.</p>
      <p>En consecuencia, entiendes y aceptas que, una vez recibida la planificación personalizada, el servicio se considera ejecutado en su parte principal y perderás tu derecho de desistimiento respecto de esa parte. El resto del ciclo (seguimiento y ajustes) se considera consumido de forma progresiva a lo largo del periodo contratado.</p>

      <h2 className="text-white font-bold text-base mt-4">7. Precio, ciclo y renovación</h2>
      <p>El servicio se contrata por ciclos mensuales. La renovación se acuerda con la coach con antelación al vencimiento del ciclo en curso.</p>

      <h2 className="text-white font-bold text-base mt-4">8. Legislación aplicable</h2>
      <p>Estas condiciones se rigen por la legislación portuguesa, sin perjuicio de los derechos irrenunciables reconocidos a la persona consumidora por su normativa nacional de residencia.</p>
    </LegalLayout>
  );
}

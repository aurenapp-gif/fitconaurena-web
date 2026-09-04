import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";
import { COMPANY, companyLine } from "@/lib/company";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function TerminosPage() {
  return (
    <LegalLayout title="Términos y condiciones" updated="13 de agosto de 2026">
      <h2 className="text-ink font-bold text-base">1. Prestador del servicio</h2>
      <p>{companyLine()}. Contacto: {COMPANY.email}. En adelante, &quot;la coach&quot;.</p>

      <h2 className="text-ink font-bold text-base mt-4">2. Objeto</h2>
      <p>El servicio consiste en asesoramiento personalizado de nutrición y entrenamiento, con seguimiento continuado a través de esta plataforma. La coach diseña y entrega una planificación personalizada tras el cuestionario inicial y realiza el seguimiento durante el ciclo contratado.</p>

      <h2 className="text-ink font-bold text-base mt-4">3. Contenidos personales e intransferibles</h2>
      <p>Los planes, materiales y contenidos que recibas son personales e intransferibles: no pueden compartirse, revenderse ni difundirse.</p>

      <h2 className="text-ink font-bold text-base mt-4">4. No sustituye al consejo médico</h2>
      <p>El asesoramiento no sustituye al consejo médico. Debes informar de cualquier condición de salud, lesión o tratamiento, y consultar con un profesional sanitario antes de empezar.</p>

      <h2 className="text-ink font-bold text-base mt-4">4.bis Responsabilidad y uso adecuado</h2>
      <p>La planificación se elabora en función de la información aportada por la clienta en el cuestionario inicial y de las indicaciones que la coach le traslada. La coach no se hace responsable de los daños, lesiones o resultados adversos derivados de una ejecución incorrecta, la modificación unilateral de las pautas, la omisión de información relevante sobre el estado de salud, o del uso del plan sin la supervisión y el seguimiento profesionales previstos en el servicio.</p>
      <p>La clienta se compromete a comunicar cualquier síntoma, molestia o cambio relevante y a no alterar la planificación por su cuenta sin consultarlo previamente.</p>

      <h2 className="text-ink font-bold text-base mt-4">5. Confidencialidad e imagen</h2>
      <p>Las llamadas grupales, los materiales y las comunicaciones con tu coach son confidenciales: no pueden grabarse, reproducirse ni difundirse, ni total ni parcialmente, en redes sociales ni en ningún otro medio. En las llamadas participan otras clientas y su privacidad también debe protegerse.</p>
      <p>Te comprometes a no crear, publicar ni difundir —en vídeo, audio, imagen o texto, y en cualquier red social o plataforma (TikTok, Instagram, YouTube, X, foros, grupos de mensajería o cualquier otra)— contenido difamatorio, injurioso o calumnioso sobre la coach, su equipo, su empresa o el servicio, ni afirmaciones falsas, engañosas o sacadas de contexto que puedan dañar su reputación o su actividad profesional.</p>
      <p>Si en algún momento no estás conforme con el servicio, te comprometes a comunicárselo primero a tu coach por el canal directo, para darle la oportunidad de resolverlo antes de difundirlo públicamente.</p>
      <p>El nombre, la marca, la imagen, la voz y los contenidos de la coach están protegidos: no pueden utilizarse con fines comerciales o promocionales, ni incorporarse a publicaciones propias, sin su autorización previa y por escrito.</p>
      <p>El incumplimiento de estos puntos puede conllevar la baja inmediata del programa, sin perjuicio de las acciones legales que correspondan.</p>

      <h2 className="text-ink font-bold text-base mt-4">6. Composición del servicio y valor de cada parte</h2>
      <p>El servicio se compone de dos partes con pesos distintos:</p>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li><strong className="text-ink">Estrategia, llamada estratégica inicial y planificaciones (70 %).</strong> Constituye la fase más exigente del proceso: análisis del cuestionario, entrevista personalizada y elaboración y entrega de la planificación de nutrición y/o entrenamiento.</li>
        <li><strong className="text-ink">Seguimiento y adaptaciones (30 %).</strong> Comprende el acompañamiento durante el resto del ciclo contratado: revisión de check-ins, ajustes de la planificación y resolución de dudas.</li>
      </ul>
      <p>Estos porcentajes reflejan el valor efectivo entregado en cada fase y se emplean como criterio para calcular la parte proporcional prestada en caso de baja anticipada.</p>

      <h2 className="text-ink font-bold text-base mt-4">7. Inicio inmediato y desistimiento</h2>
      <p>Al aceptar estas condiciones, solicitas expresamente que la prestación del servicio comience de forma inmediata, sin esperar a que transcurra el plazo de desistimiento de 14 días naturales.</p>
      <p>Reconoces que la prestación principal del servicio consiste en el diseño y la entrega de la planificación personalizada (nutrición y/o entrenamiento) a partir de la información aportada en el cuestionario inicial, y que la coach comienza a preparar dicha planificación desde el mismo momento de tu aceptación.</p>
      <p>En consecuencia, entiendes y aceptas que, una vez recibida la planificación personalizada, el servicio se considera ejecutado en su parte principal —equivalente al 70 % descrito en el apartado 6— y perderás tu derecho de desistimiento respecto de esa parte. El 30 % restante (seguimiento y adaptaciones) se considera consumido de forma progresiva a lo largo del periodo contratado.</p>

      <h2 className="text-ink font-bold text-base mt-4">8. Duración, precio y pago</h2>
      <p>El programa tiene una <strong className="text-ink">duración de doce (12) meses</strong>. La clienta puede optar entre abonar el precio en un <strong className="text-ink">pago único</strong> o en <strong className="text-ink">pagos fraccionados</strong>, con periodicidad mensual, ya sea directamente con la empresa o a través de una entidad financiadora externa (por ejemplo, Sequra, Klarna u otra plataforma equivalente).</p>
      <p>En caso de fraccionamiento, la clienta se obliga a abonar cada una de las cuotas en su fecha de vencimiento, con independencia de que el pago se gestione directamente con la empresa o a través de la entidad financiadora que fraccionó el importe. La obligación de pago del importe total del programa subsiste durante los 12 meses contratados.</p>
      <p>El impago de cualquier cuota, con independencia de que el cobro corresponda a la empresa o a la entidad financiadora, constituye un <strong className="text-ink">incumplimiento contractual</strong> por parte de la clienta y determinará el <strong className="text-ink">vencimiento anticipado</strong> de todas las cuotas pendientes hasta completar los 12 meses del programa. La empresa quedará facultada para <strong className="text-ink">exigir el pago íntegro del importe pendiente</strong> y para <strong className="text-ink">emprender acciones legales por deuda</strong> —extrajudiciales y judiciales— hasta obtener su cobro efectivo.</p>
      <p>Se repercutirán además los <strong className="text-ink">intereses de demora</strong> devengados desde la fecha de cada vencimiento, los <strong className="text-ink">gastos de recobro</strong> (incluida la intervención de agencias de recuperación de deuda), las <strong className="text-ink">costas judiciales</strong> y los <strong className="text-ink">honorarios de abogado y procurador</strong> derivados del procedimiento. La deuda podrá comunicarse a ficheros de solvencia patrimonial en los términos previstos por la normativa aplicable.</p>
      <p>Si la financiación se ha instrumentado a través de una entidad externa (Sequra, Klarna u otra equivalente), el impago frente a dicha entidad no exonera a la clienta frente a la empresa: subsisten las obligaciones y las acciones descritas en los párrafos anteriores.</p>

      <h2 className="text-ink font-bold text-base mt-4">9. Reserva de plaza en cupo limitado</h2>
      <p>El programa se ofrece con un <strong className="text-ink">número limitado de plazas por convocatoria</strong>, con el fin de garantizar la calidad del seguimiento personalizado. Al aceptar comenzar y confirmar tu plaza, la empresa la reserva a tu nombre y <strong className="text-ink">deja de ofrecerla a otras candidatas en lista de espera</strong>, que son rechazadas o pospuestas.</p>
      <p>Reconoces y aceptas expresamente que la aceptación de una plaza limitada genera para la empresa un <strong className="text-ink">coste de oportunidad y unos daños ciertos</strong> (rechazo de otras candidatas, imposibilidad de comercializar esa plaza en la misma convocatoria y afectación al planning de trabajo), y que dichos daños son mayores cuanto más tarde se produzca la renuncia dentro del ciclo.</p>
      <p>En consecuencia, la renuncia unilateral a continuar con el programa una vez aceptada la plaza no libera a la clienta del pago del programa contratado, sin perjuicio del régimen de desistimiento descrito en el apartado 7 y de la parte del servicio efectivamente prestada calculada conforme al apartado 6. La empresa podrá, además, <strong className="text-ink">reclamar los daños y perjuicios</strong> ocasionados por la reserva de plaza y su posterior cancelación.</p>

      <h2 className="text-ink font-bold text-base mt-4">10. Legislación aplicable y jurisdicción</h2>
      <p>Estas condiciones se rigen por la legislación portuguesa.</p>
      <p>Para la resolución de cualquier controversia derivada del presente contrato, las partes se someten expresamente a los <strong className="text-ink">Juzgados y Tribunales de Lisboa</strong>, con renuncia a cualquier otro fuero que pudiera corresponderles, sin perjuicio de los derechos irrenunciables que la normativa de consumo del país de residencia de la persona consumidora le reconozca.</p>
    </LegalLayout>
  );
}

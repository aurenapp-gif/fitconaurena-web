/**
 * Condiciones que la clienta acepta en la pantalla de bienvenida.
 *
 * La VERSIÓN se guarda junto a la fecha de aceptación en `profiles`. Si algún
 * día se cambia el texto, hay que subir la versión: así queda constancia de qué
 * redacción exacta aceptó cada clienta, que es lo que da valor probatorio.
 */
export const TERMS_VERSION = "2026-08-1";

export const PRIVACY_TEXT = [
  "Tus datos (nombre, email, foto, cuestionario, check-ins, medidas y fotos de progreso) se tratan con la única finalidad de prestarte el servicio de asesoramiento y hacer tu seguimiento.",
  "No se ceden a terceros salvo a los proveedores necesarios para que la plataforma funcione (alojamiento, envío de emails y notificaciones), y no se usan para ninguna otra finalidad.",
  "Tus fotos de progreso son privadas: solo las ve tu coach. Nunca se publican ni se comparten sin tu permiso expreso.",
  "Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a la dirección de contacto de tu coach.",
];

export const TERMS_TEXT = [
  "El servicio consiste en asesoramiento personalizado de nutrición y entrenamiento, con seguimiento continuado a través de esta plataforma.",
  "Los planes y contenidos que recibas son personales e intransferibles: no pueden compartirse, revenderse ni difundirse.",
  "El asesoramiento no sustituye al consejo médico. Debes informar de cualquier condición de salud, lesión o tratamiento, y consultar con un profesional sanitario antes de empezar.",
];

/**
 * Renuncia informada al desistimiento. Redactado conforme al art. 103.a) del
 * texto refundido de la Ley General para la Defensa de los Consumidores y
 * Usuarios: para que la renuncia surta efecto, la persona consumidora debe
 * (1) solicitar expresamente que la ejecución comience de inmediato y (2)
 * reconocer que perderá el derecho cuando el servicio se haya ejecutado por
 * completo. Ambas cosas deben constar de forma expresa, y por eso se muestran
 * literalmente y se aceptan con una casilla que NO viene marcada.
 */
export const WITHDRAWAL_TEXT = [
  "Solicito expresamente que la prestación del servicio comience de forma inmediata, sin esperar a que transcurra el plazo de desistimiento de 14 días naturales.",
  "Entiendo y acepto que, al comenzar el servicio a petición mía, perderé mi derecho de desistimiento una vez el servicio haya sido ejecutado por completo.",
  "Soy consciente de que, desde el momento en que acepto, mi coach empieza a preparar mi plan personalizado y el servicio se considera iniciado.",
];

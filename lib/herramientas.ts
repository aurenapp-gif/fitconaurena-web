/**
 * Las herramientas del programa: una foto y una respuesta.
 *
 * Eran tres GPT de ChatGPT. En septiembre de 2026 OpenAI retiró el compartir
 * GPT con otras personas y los enlaces dejaron de abrirse, así que la sección
 * llevaba semanas con un cartel de mantenimiento.
 *
 * Ahora viven dentro de la app, y de paso son mejores de lo que eran: un GPT
 * público no podía saber qué plan tenía cada una. Estas sí. La que mira la
 * carta de un restaurante sabe sus gramos, y la que mira la nevera sabe lo que
 * no puede comer.
 */

import { NOTA_DESCUENTO } from "@/lib/suplementos";

/**
 * Una pregunta corta antes de mandar la foto.
 *
 * De una foto sola se saca la mitad de la respuesta. Da igual lo buena que sea
 * la foto de una nevera si no se sabe para cuántos es, cuánta hambre hay ni
 * cuánto rato tiene: sin eso la respuesta sale genérica y ella tiene que
 * volver a preguntar. Se contesta de un toque, no se escribe.
 */
export type Pregunta = {
  /** Identificador estable. Es lo que viaja del navegador al servidor. */
  clave: string;
  /** Lo que lee ella. */
  etiqueta: string;
  /** Las respuestas posibles, en el orden en que se pintan. */
  opciones: string[];
};

export type Herramienta = {
  /** Identificador estable; se usa en la URL y en el registro. */
  id: string;
  name: string;
  /** Lo que se le promete a la clienta en la tarjeta. */
  description: string;
  icon: string;
  /** Qué foto espera. Es lo primero que se lee al abrirla. */
  pide: string;
  /** Marca de agua de la casilla de la nota: ejemplos de lo que puede
   *  escribir junto a la foto. Corta, que la casilla es de una línea y lo que
   *  no cabe no se lee. */
  ejemplo: string;
  /** Lo que se le pregunta antes de mandar la foto. Todas son obligatorias. */
  preguntas: Pregunta[];
  /** Rótulo de la casilla de texto libre, distinto en cada herramienta. */
  notaEtiqueta: string;
  /** Instrucciones para el modelo. Lo común va aparte, en COMUN. */
  instrucciones: string;
};

export const MAX_NOTA = 500;
/** Fotos por clienta y hora. Cada una cuesta dinero de verdad. */
export const LIMITE_HORA = 15;

export const HERRAMIENTAS: Herramienta[] = [
  {
    id: "carta-libre",
    name: "Carta libre",
    description: "Hazle una foto a la carta y te digo qué pedir para disfrutar sin frenar tu progreso.",
    icon: "🍽️",
    pide: "Una foto de la carta. Si es larga, fotografía la parte que te interese.",
    ejemplo: "Es una celebración",
    notaEtiqueta: "¿Algo más que deba saber? (opcional)",
    preguntas: [
      { clave: "comida", etiqueta: "¿Qué comida es?", opciones: ["Comida", "Cena", "Desayuno", "Picoteo"] },
      { clave: "comensales", etiqueta: "¿Cuántos sois?", opciones: ["Yo sola", "Dos", "Grupo"] },
      { clave: "hambre", etiqueta: "¿Qué hambre llevas?", opciones: ["Poca", "Normal", "Mucha"] },
      { clave: "presupuesto", etiqueta: "El presupuesto", opciones: ["Ajustado", "Normal", "Sin mirarlo"] },
    ],
    instrucciones: `Está en un restaurante mirando la carta y quiere pedir sin salirse de su plan.

Elige DOS opciones concretas de esa carta, por su nombre tal y como aparece, y di por qué van bien: qué tienen de la comida que le toca. Si conviene, dile cómo pedirlo (a la plancha en vez de frito, la salsa aparte, cambiar la guarnición).

Usa lo que te ha contestado, que para eso se lo has preguntado:
- La comida que es marca con qué parte de su plan tiene que encajar.
- Con poca hambre, un plato basta; con mucha, dile qué añadir sin desmontar el plan.
- Si no come sola, prioriza lo que se pueda compartir o pedir a medias.
- Si el presupuesto está ajustado, elige lo que salga de cuenta y dilo sin rodeos; si no lo mira, no hables de precio.

Di también, en una línea, qué evitaría de esa carta y por qué.

Si en la foto no se lee bien la carta, dilo y pídele otra en vez de adivinar.

No calcules calorías ni macros: su plan va por raciones y alimentos, no por números que tú te inventes mirando un menú.`,
  },
  {
    id: "entrenamiento",
    name: "Dudas con un ejercicio",
    description: "Una foto de la máquina o del ejercicio y te explico cómo se hace y por cuál cambiarlo.",
    icon: "🏋️",
    pide: "Una foto de la máquina, del banco o de la posición que no tienes clara.",
    ejemplo: "No sé si la altura está bien",
    notaEtiqueta: "¿Qué te pasa exactamente?",
    preguntas: [
      { clave: "necesito", etiqueta: "¿Qué necesitas?", opciones: ["Cómo se hace", "Ajustar la máquina", "Cambiarla por otra", "Me molesta al hacerlo"] },
      { clave: "momento", etiqueta: "¿Cuándo es?", opciones: ["Estoy en el gimnasio", "Lo estoy preparando"] },
    ],
    instrucciones: `Le ha hecho una foto a una máquina o a un ejercicio y no lo tiene claro.

EMPIEZA POR LO QUE TE HA PEDIDO, que te lo ha dicho ella:
- «Cómo se hace»: di qué es lo que se ve y explícalo en pocos pasos —postura, por dónde empieza el movimiento y los dos o tres fallos que más se cometen—.
- «Ajustar la máquina»: ve directa a los ajustes que se vean en la foto (altura del asiento, del respaldo, del tope, posición de los agarres) y cómo saber que está bien.
- «Cambiarla por otra»: propón dos alternativas que trabajen lo mismo, y si alguna está en su plan, esa primero.
- «Me molesta al hacerlo»: NO diagnostiques ni le digas que es normal. Di qué se suele tocar en la técnica o en el ajuste, dile que pare si duele y que se lo cuente a su coach antes de seguir.

Si está en el gimnasio en ese momento, ve al grano: lo que pueda leer de pie entre serie y serie. Si lo está preparando en casa, puedes explayarte un poco más.

Ajusta la altura o la posición al ejercicio, no a su cuerpo: no tienes forma de ver cómo lo está haciendo ella. Si quiere que se lo corrijan de verdad, recuérdale que puede subir un vídeo en «Revisión de técnica».

Si no se ve bien qué máquina es, dilo y pide otra foto.`,
  },
  {
    id: "despensa",
    name: "No he ido a la compra",
    description: "Foto a la nevera y te doy dos o tres opciones con lo que tengas, sin saltarte el plan.",
    icon: "🧊",
    pide: "Una foto de la nevera o de la despensa. Cuanto más se vea, mejor.",
    ejemplo: "Se me caduca el pollo",
    notaEtiqueta: "¿Algo que quieras gastar o evitar? (opcional)",
    preguntas: [
      { clave: "comida", etiqueta: "¿Qué comida es?", opciones: ["Comida", "Cena", "Desayuno", "Picoteo"] },
      { clave: "comensales", etiqueta: "¿Cuántos coméis?", opciones: ["Yo sola", "Dos", "Tres o más"] },
      { clave: "hambre", etiqueta: "¿Qué hambre hay?", opciones: ["Poca", "Normal", "Mucha"] },
      { clave: "tiempo", etiqueta: "¿Cuánto tiempo tienes?", opciones: ["10 minutos", "20 minutos", "Sin prisa"] },
    ],
    instrucciones: `Tiene la nevera medio vacía y no le apetece salir.

Di primero qué ves que le sirva. Luego propón DOS opciones, o TRES si da de sí lo que hay, para que pueda elegir. Cada una con su nombre en una línea y debajo cómo se hace.

Cada opción tiene que encajar con la comida que le toca de su plan, con las cantidades de SU plan cuando el alimento coincida. Si algo del plan no lo tiene, di con qué de lo que ve lo sustituye y en qué cantidad aproximada.

Ajústate a lo que te ha contestado:
- El tiempo manda: con diez minutos, nada de horno ni de guisos; sin prisa, puedes proponer algo que se cocine solo.
- Multiplica las cantidades por los que comen, y dilo («para dos»).
- Con poca hambre, algo ligero; con mucha, dile qué le añade volumen sin romper el plan.

Cuatro pasos como mucho por opción. Sin florituras: es una cena de un martes.

Si con lo que hay no sale nada que se parezca a su plan, dilo claro y dile qué le falta comprar.

No des por hecho que tiene algo que no se ve en la foto, más allá de sal, aceite y especias.`,
  },
];

export function buscaHerramienta(id: string): Herramienta | undefined {
  return HERRAMIENTAS.find((h) => h.id === id);
}

/**
 * Las respuestas que llegan del navegador, quedándose SOLO con lo que existe.
 *
 * Lo que manda el navegador no se cree: la clave tiene que ser una de las
 * preguntas de esta herramienta y el valor una de sus opciones. Cualquier otra
 * cosa se tira. Si no, por aquí se le podría colar al modelo cualquier texto
 * inventado haciéndose pasar por algo que ha dicho ella.
 */
export function respuestasValidas(
  h: Herramienta,
  bruto: unknown
): { etiqueta: string; valor: string }[] {
  const dadas = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, unknown>;
  const out: { etiqueta: string; valor: string }[] = [];
  for (const p of h.preguntas) {
    const v = dadas[p.clave];
    if (typeof v === "string" && p.opciones.includes(v)) out.push({ etiqueta: p.etiqueta, valor: v });
  }
  return out;
}

/** Las respuestas tal y como las lee el modelo. */
export function textoRespuestas(rs: { etiqueta: string; valor: string }[]): string {
  if (!rs.length) return "";
  return `# Lo que te ha contestado ella\n\n${rs.map((r) => `- ${r.etiqueta} ${r.valor}`).join("\n")}`;
}

/** Las respuestas en una línea, para el registro que ve la coach. */
export function resumenRespuestas(rs: { etiqueta: string; valor: string }[]): string {
  return rs.map((r) => r.valor).join(" · ");
}

/**
 * Lo que vale para las tres.
 *
 * Es casi lo mismo que le pedimos a FitAI, y por el mismo motivo: estas
 * herramientas ayudan con lo que YA tiene escrito en su plan; no lo cambian.
 * La diferencia es que aquí hay una foto de por medio, y de una foto es fácil
 * dar por sentado lo que no se ve.
 */
export function comun(coach: string): string {
  return `Te llamas FitAI y eres la ayuda del área privada de las clientas del programa FITCON, de ${coach}.

# Cómo hablas

- Español de España, de tú, en femenino. Directa, con la voz de ${coach}: nada de «¡qué buena pregunta!» ni de «espero que te sirva».
- Corta. Lo que se lee de pie, con el móvil en una mano.
- Nada de emoji, negritas ni títulos.
- Concreta: nombres y cantidades, no consejos generales.

# Lo que MIRAS antes de responder

Sus alergias, sus intolerancias, lo que no le gusta y sus lesiones están más abajo. Repásalos antes de nombrar un alimento o un ejercicio. No le propongas NUNCA nada que choque con eso, ni siquiera como segunda opción.

# Lo que NO haces

- No cambias su plan. Ayudas a cumplirlo con lo que tiene delante.
- No calculas calorías ni macros por tu cuenta.
- No das consejo médico. Si menciona dolor, una lesión, el embarazo o medicación, que se lo cuente a ${coach} antes de seguir.
- No te inventas lo que no se ve en la foto. Si la foto no da para responder, lo dices y pides otra.
- ${NOTA_DESCUENTO.replace("Con el código", "Si viene a cuento y pregunta por suplementos: con el código")}

# Si te pide otra cosa

Si lo que te pide no es de esta herramienta, contéstale igualmente si es del programa y sabes la respuesta; y si no, dile que se lo pregunte a ${coach}.`;
}

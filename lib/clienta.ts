/**
 * Todo lo que la app sabe de UNA clienta, en un solo sitio.
 *
 * Lo usan FitAI y las herramientas. Vive aparte para que las dos miren
 * exactamente los mismos datos: si una supiera de sus alergias y la otra no,
 * la que no lo supiera acabaría proponiéndole algo que no puede comer.
 *
 * Se arma SIEMPRE en el servidor a partir de su sesión. Nunca llega del
 * navegador: si viniera de ahí, cualquiera podría pedir los datos de otra.
 */

import { sbSelect } from "@/lib/supabase";
import { type ContextoClienta } from "@/lib/fitai";
import { leerPlan } from "@/lib/planes";
import { periodoDe, proximaRevision, todayMadrid } from "@/lib/revisiones";
import { diaDe, fechaCorta, hoyMadrid, renovacionAlimentacion, renovacionEntrenamiento } from "@/lib/renovaciones";
import { litros, pasos as textoPasos, pauta, type Supplement } from "@/lib/suplementos";
import { nombresDe } from "@/lib/entreno";
import { rachaDias } from "@/lib/habitos";
import { edadDe, type Questionnaire } from "@/lib/profile";
import { MEDIDAS } from "@/lib/progreso";

type Plan = {
  id: string;
  type: "nutricion" | "entrenamiento";
  title: string | null;
  note: string | null;
  file_path: string | null;
  contenido?: string | null;
  estructura?: unknown;
  semanas?: number | null;
  created_at: string;
  exercises?: unknown;
};
type Revision = Record<string, unknown> & {
  created_at: string;
  note: string | null;
  coach_reply: string | null;
};

/** Texto de una respuesta del cuestionario, recortado y sin vacíos. */
function campo(q: Questionnaire | null, id: string, max = 300): string | null {
  const v = q?.[id];
  const t = typeof v === "string" ? v.trim() : "";
  return t && t.toLowerCase() !== "no" && t.toLowerCase() !== "ninguna" ? t.slice(0, max) : null;
}

/**
 * Cómo va de medidas: la última y cuánto ha cambiado desde la anterior. Es lo
 * que le permite decir «llevas tres centímetros menos de cintura» en vez de
 * «vas progresando bien».
 */
function comparaMedidas(revisiones: Revision[]): string[] {
  const [ahora, antes] = revisiones;
  if (!ahora) return [];
  const out: string[] = [];
  for (const m of MEDIDAS) {
    const v = Number(ahora[m.key]);
    if (!Number.isFinite(v) || v <= 0) continue;
    const p = antes ? Number(antes[m.key]) : NaN;
    const delta = Number.isFinite(p) && p > 0 ? v - p : null;
    const signo = delta === null || Math.abs(delta) < 0.05
      ? ""
      : ` (${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1).replace(".", ",")} desde la anterior)`;
    out.push(`${m.label} ${v.toLocaleString("es-ES")} ${m.unidad}${signo}`);
  }
  return out;
}

/**
 * El contexto de la clienta se arma AQUÍ, en el servidor, a partir de la
 * sesión. Nunca llega del navegador: si viniera de ahí, cualquiera podría
 * pedirle a FitAI que hablara de los datos de otra.
 */
export async function datosDe(email: string): Promise<ContextoClienta> {
  const e = encodeURIComponent(email);
  const hoy = todayMadrid();
  const [perfil, planes, revisiones, suplementos, dias] = await Promise.all([
    sbSelect<{
      display_name: string | null; created_at: string | null;
      water_target_l: number | null; steps_target: number | null;
      questionnaire: Questionnaire | null;
    }>("profiles", `select=display_name,created_at,water_target_l,steps_target,questionnaire&email=eq.${e}`)
      .then((r) => r[0] ?? null).catch(() => null),
    // Las columnas de la lectura pueden no existir todavía (falta ejecutar
    // supabase/planes.sql). PostgREST devuelve 400, así que se reintenta sin
    // ellas: FitAI responde igual, solo sin el detalle del plan.
    sbSelect<Plan>("plans", `select=id,type,title,note,file_path,contenido,estructura,semanas,created_at,exercises&member_email=eq.${e}&order=created_at.desc&limit=20`)
      .catch(() => sbSelect<Plan>("plans", `select=id,type,title,note,file_path,created_at,exercises&member_email=eq.${e}&order=created_at.desc&limit=20`)
        .catch(() => [] as Plan[])),
    sbSelect<Revision>("check_ins", `select=*&member_email=eq.${e}&order=created_at.desc&limit=4`).catch(() => [] as Revision[]),
    sbSelect<Supplement>("member_supplements", `select=*&member_email=eq.${e}&order=created_at.asc`).catch(() => [] as Supplement[]),
    sbSelect<{ day: string }>("habit_logs", `select=day&member_email=eq.${e}`).catch(() => [] as { day: string }[]),
  ]);

  const q = perfil?.questionnaire ?? null;
  const nut = planes.find((p) => p.type === "nutricion") ?? null;
  const ent = planes.find((p) => p.type === "entrenamiento") ?? null;
  const renNut = renovacionAlimentacion(nut ? diaDe(nut.created_at) : null, hoyMadrid());
  const renEnt = renovacionEntrenamiento(ent ? diaDe(ent.created_at) : null, hoyMadrid(), ent?.semanas ?? null);
  const ultima = revisiones[0] ?? null;
  const hecha = !!ultima && diaDe(ultima.created_at) >= periodoDe(hoy).inicio;
  const prox = proximaRevision(hoy, hecha);

  // Los dos planes se leen a la vez; si uno falla, el otro sigue.
  const [leidoNut, leidoEnt] = await Promise.all([
    nut ? leerPlan(nut).catch(() => null) : Promise.resolve(null),
    ent ? leerPlan(ent).catch(() => null) : Promise.resolve(null),
  ]);

  return {
    nombre: perfil?.display_name || email.split("@")[0],
    edad: edadDe(campo(q, "fecha_nacimiento", 10)),
    desde: perfil?.created_at ? fechaCorta(diaDe(perfil.created_at)) : null,
    objetivo: campo(q, "objetivo"),
    experiencia: campo(q, "experiencia"),
    diasEntreno: campo(q, "dias_entreno"),
    lugarEntreno: campo(q, "lugar_entreno"),
    comidasDia: campo(q, "comidas_dia"),
    lesiones: campo(q, "lesiones", 600),
    alergias: campo(q, "alergias", 600),
    evitar: campo(q, "alimentos_evitar", 600),
    ciclo: campo(q, "ciclo"),
    notasAlta: campo(q, "notas", 600),
    proximaRevision: fechaCorta(prox.fecha),
    revisionPendiente: prox.pendiente,
    ultimaRevision: ultima ? fechaCorta(diaDe(ultima.created_at)) : null,
    medidas: comparaMedidas(revisiones),
    notaClienta: ultima?.note?.trim().slice(0, 600) || null,
    respuestasCoach: revisiones
      .map((r) => r.coach_reply?.trim())
      .filter((r): r is string => !!r)
      .slice(0, 3)
      .map((r) => r.slice(0, 700)),
    planNutricion: nut ? `${nut.title?.trim() || "sin título"}, subido el ${fechaCorta(diaDe(nut.created_at))}${renNut.toca ? `; se renueva el ${fechaCorta(renNut.toca)}` : ""}` : null,
    notaNutricion: nut?.note?.trim().slice(0, 800) || null,
    contenidoNutricion: leidoNut?.texto ?? null,
    planEntrenamiento: ent ? `${ent.title?.trim() || "sin título"}, subido el ${fechaCorta(diaDe(ent.created_at))}${renEnt.toca ? `; vigente hasta el ${fechaCorta(renEnt.toca)}` : ""}` : null,
    notaEntrenamiento: ent?.note?.trim().slice(0, 800) || null,
    contenidoEntrenamiento: leidoEnt?.texto ?? null,
    ejercicios: nombresDe(ent?.exercises),
    agua: perfil?.water_target_l != null ? litros(perfil.water_target_l) : null,
    pasos: perfil?.steps_target != null ? textoPasos(perfil.steps_target) : null,
    racha: rachaDias(new Set(dias.map((d) => d.day)), hoy) || null,
    suplementos: suplementos.map((s) => `${s.name}${pauta(s) ? ` (${pauta(s)})` : ""}`),
  };
}

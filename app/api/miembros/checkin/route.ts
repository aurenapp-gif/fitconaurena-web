import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/members";
import { isAccessRevoked } from "@/lib/guard";
import { sbSelect, sbInsert, sbUpload, safePath } from "@/lib/supabase";
import { validateUpload } from "@/lib/upload";
import { sendPushToEmail } from "@/lib/push";

export const runtime = "nodejs";
export const maxDuration = 60;

const MEASURES = ["waist", "hips", "chest", "arm", "thigh"] as const;

async function uploadPhoto(form: FormData, field: string): Promise<string | null> {
  const f = form.get(field);
  if (f instanceof File && f.size > 0) {
    const path = safePath(`${field}-${f.name || "foto"}`);
    await sbUpload("checkins", path, await f.arrayBuffer(), f.type || "image/jpeg");
    return path;
  }
  return null;
}

// Valida todas las fotos presentes en el formulario; devuelve error o null.
function validatePhotos(form: FormData): string | null {
  for (const field of ["photo_front", "photo_side", "photo_back"]) {
    const f = form.get(field);
    if (f instanceof File && f.size > 0) {
      const err = validateUpload(f, "image");
      if (err) return err;
    }
  }
  return null;
}

// Lee una medida del formulario (cm). Devuelve número válido (0–300) o null.
function readMeasure(form: FormData, field: string): number | null {
  const raw = String(form.get(field) ?? "").replace(",", ".").trim();
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 300) return NaN; // NaN = inválido
  return n;
}

// Cualquier miembro con sesión válida puede enviar su check-in.
export async function POST(req: NextRequest) {
  const email = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(email)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const weightRaw = String(form.get("weight") ?? "").replace(",", ".").trim();
  const weight = weightRaw === "" ? null : Number(weightRaw);
  const note = String(form.get("note") ?? "").trim().slice(0, 2000);

  if (weight !== null && (Number.isNaN(weight) || weight <= 0 || weight > 500)) {
    return NextResponse.json({ error: "Peso no válido." }, { status: 400 });
  }

  // Medidas corporales (cm), todas opcionales.
  const measures: Record<string, number> = {};
  for (const m of MEASURES) {
    const v = readMeasure(form, m);
    if (Number.isNaN(v)) return NextResponse.json({ error: `Medida no válida (${m}).` }, { status: 400 });
    if (v !== null) measures[m] = v;
  }
  const hasMeasure = Object.keys(measures).length > 0;

  const hasPhoto = ["photo_front", "photo_side", "photo_back"].some((k) => {
    const f = form.get(k);
    return f instanceof File && f.size > 0;
  });
  if (weight === null && !note && !hasPhoto && !hasMeasure) {
    return NextResponse.json({ error: "Añade al menos peso, medidas, nota o foto." }, { status: 400 });
  }
  const badPhoto = validatePhotos(form);
  if (badPhoto) return NextResponse.json({ error: badPhoto }, { status: 400 });

  try {
    const [photo_front, photo_side, photo_back] = await Promise.all([
      uploadPhoto(form, "photo_front"),
      uploadPhoto(form, "photo_side"),
      uploadPhoto(form, "photo_back"),
    ]);
    await sbInsert("check_ins", {
      member_email: email,
      weight,
      note: note || null,
      photo_front,
      photo_side,
      photo_back,
      ...measures,
    });
  } catch (err) {
    console.error("[api/miembros/checkin] error", err);
    return NextResponse.json({ error: "No se pudo guardar el check-in." }, { status: 500 });
  }

  // Hito (no bloqueante): ¿ha alcanzado su objetivo o un nuevo kg? Felicitación.
  let celebrate: string | null = null;
  if (weight !== null) {
    try {
      celebrate = await milestone(email, weight);
      if (celebrate) {
        sendPushToEmail(email, { title: "¡Enhorabuena! 🎉", body: celebrate, url: "/miembros/checkins" })
          .catch((e) => console.error("[checkin] push hito", e));
      }
    } catch (e) { console.error("[checkin] milestone", e); }
  }

  return NextResponse.json({ ok: true, celebrate });
}

/**
 * Detecta un hito de progreso al registrar `weight`, comparándolo con el
 * histórico y el objetivo del cuestionario. Devuelve el texto de felicitación o
 * null. Soporta objetivos de bajar o de subir de peso.
 */
async function milestone(email: string, weight: number): Promise<string | null> {
  const [prior, profs] = await Promise.all([
    sbSelect<{ weight: number | null; created_at: string }>(
      "check_ins",
      `select=weight,created_at&member_email=eq.${encodeURIComponent(email)}&order=created_at.asc`
    ),
    sbSelect<{ questionnaire: Record<string, string> | null }>(
      "profiles",
      `select=questionnaire&email=eq.${encodeURIComponent(email)}`
    ),
  ]);

  // Pesos anteriores a este (el recién insertado es el último de la lista).
  const weights = prior.map((r) => Number(r.weight)).filter((w) => Number.isFinite(w));
  const priorWeights = weights.slice(0, -1); // todos menos el actual
  const q = profs[0]?.questionnaire ?? {};
  const goal = Number(q.peso_objetivo);
  const startQ = Number(q.peso_actual);
  const baseline = priorWeights.length ? priorWeights[0] : Number.isFinite(startQ) ? startQ : weight;
  const hasGoal = Number.isFinite(goal);
  const lossGoal = !hasGoal || goal <= baseline; // por defecto, objetivo de bajar

  const minPrior = priorWeights.length ? Math.min(...priorWeights) : null;
  const maxPrior = priorWeights.length ? Math.max(...priorWeights) : null;

  // ¿Acaba de alcanzar el objetivo (primera vez)?
  if (hasGoal) {
    if (lossGoal && weight <= goal && (minPrior == null || minPrior > goal)) {
      return `¡Has alcanzado tu objetivo de ${goal} kg! 🏆 Un trabajo increíble.`;
    }
    if (!lossGoal && weight >= goal && (maxPrior == null || maxPrior < goal)) {
      return `¡Has alcanzado tu objetivo de ${goal} kg! 🏆 Un trabajo increíble.`;
    }
  }

  // ¿Nuevo kg de progreso (entero) respecto a su mejor marca anterior?
  const progress = lossGoal ? baseline - weight : weight - baseline;
  const bestPrior = lossGoal
    ? baseline - (minPrior ?? baseline)
    : (maxPrior ?? baseline) - baseline;
  const newKg = Math.floor(progress);
  const prevKg = Math.floor(Math.max(0, bestPrior));
  if (progress >= 1 && newKg > prevKg) {
    const verb = lossGoal ? "bajado" : "ganado";
    return `¡Ya has ${verb} ${newKg} kg! 🎉 Sigue así.`;
  }

  return null;
}

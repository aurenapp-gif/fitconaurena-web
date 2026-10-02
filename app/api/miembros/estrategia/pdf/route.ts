import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin, adminEmails } from "@/lib/members";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbSelect } from "@/lib/supabase";
import { faseEnCurso, type Fase } from "@/lib/estrategia";
import { CINTURA } from "@/lib/evidencia";
import { nombreArchivo, pdfEstrategia, type BloqueTexto } from "@/lib/pdf-estrategia";

export const runtime = "nodejs";
export const maxDuration = 30;

type Revision = { created_at: string; weight: number | string | null; waist: number | string | null };
type Habito = { day: string; steps: number | string | null; sleep: number | string | null };

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const un = (n: number, d = 1) => Number(n.toFixed(d)).toLocaleString("es-ES");
const conSigno = (n: number, u: string) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${un(Math.abs(n))} ${u}`;

/**
 * El PDF de estrategia de una clienta. Solo la coach.
 *
 * Los NÚMEROS los pone el servidor leyendo sus datos; del formulario solo
 * vienen las notas. Así el PDF que se le manda no puede llevar una cifra que
 * no esté en la app.
 *
 * Body: { email, bloques: [{ titulo, cuerpo }] }
 */
export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { email?: unknown; bloques?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  if (!isValidEmail(email)) return NextResponse.json({ error: "Email no válido." }, { status: 400 });

  const bloques: BloqueTexto[] = Array.isArray(body.bloques)
    ? body.bloques
        .filter((b): b is { titulo: unknown; cuerpo: unknown } => !!b && typeof b === "object")
        .map((b) => ({
          titulo: typeof b.titulo === "string" ? b.titulo.trim().slice(0, 80) : "",
          cuerpo: typeof b.cuerpo === "string" ? b.cuerpo.trim().slice(0, 4000) : "",
        }))
        .filter((b) => b.titulo && b.cuerpo)
    : [];
  if (bloques.length === 0) {
    return NextResponse.json({ error: "Escribe algo antes de generar el PDF." }, { status: 400 });
  }

  const e = encodeURIComponent(email);
  const desde30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const coachEmail = adminEmails()[0];

  const [perfil, fases, revisiones, habitos, coachPerfil] = await Promise.all([
    sbSelect<{ display_name: string | null; strategy_phase: number | null }>(
      "profiles", `select=display_name,strategy_phase&email=eq.${e}`
    ).then((r) => r[0] ?? null).catch(() => null),
    sbSelect<Fase>("strategy_phases", `select=posicion,titulo,detalle&member_email=eq.${e}&order=posicion.asc`)
      .catch(() => [] as Fase[]),
    sbSelect<Revision>("check_ins", `select=created_at,weight,waist&member_email=eq.${e}&order=created_at.asc`)
      .catch(() => [] as Revision[]),
    sbSelect<Habito>("habit_logs", `select=day,steps,sleep&member_email=eq.${e}&day=gte.${desde30}`)
      .catch(() => [] as Habito[]),
    coachEmail
      ? sbSelect<{ display_name: string | null }>("profiles", `select=display_name&email=eq.${encodeURIComponent(coachEmail)}`)
          .then((r) => r[0]?.display_name ?? null).catch(() => null)
      : Promise.resolve(null),
  ]);

  const nombre = perfil?.display_name?.trim() || email.split("@")[0];
  const actual = faseEnCurso(fases, perfil?.strategy_phase);
  const esta = actual ? fases.find((f) => f.posicion === actual) : null;

  // ---- Los números, de sus datos -------------------------------------------
  const datos: { etiqueta: string; valor: string }[] = [];
  const pesos = revisiones.map((r) => ({ f: r.created_at, kg: num(r.weight) })).filter((x) => x.kg !== null) as { f: string; kg: number }[];
  if (pesos.length > 0) {
    const ultima = pesos[pesos.length - 1];
    datos.push({ etiqueta: "Peso en esta revision", valor: `${un(ultima.kg)} kg` });
    if (pesos.length >= 2) {
      const anterior = pesos[pesos.length - 2];
      datos.push({ etiqueta: "Desde la revision anterior", valor: conSigno(ultima.kg - anterior.kg, "kg") });
      datos.push({ etiqueta: "Desde que empezaste", valor: conSigno(ultima.kg - pesos[0].kg, "kg") });
    }
  }
  const cinturas = revisiones.map((r) => num(r.waist)).filter((x): x is number => x !== null);
  if (cinturas.length > 0) {
    const ultima = cinturas[cinturas.length - 1];
    datos.push({ etiqueta: "Cintura", valor: `${un(ultima)} cm` });
    if (cinturas.length >= 2) {
      const d = ultima - cinturas[0];
      // Por debajo del error de medirse una misma no se promete un cambio.
      datos.push({
        etiqueta: "Cintura desde que empezaste",
        valor: Math.abs(d) < CINTURA.ruidoCm ? "igual" : conSigno(d, "cm"),
      });
    }
  }
  const medias = (campo: "steps" | "sleep") => {
    const v = habitos.map((x) => num(x[campo])).filter((x): x is number => x !== null && x > 0);
    return v.length >= 7 ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const pasos = medias("steps");
  if (pasos !== null) datos.push({ etiqueta: "Pasos al dia (media del mes)", valor: Math.round(pasos).toLocaleString("es-ES") });
  const sueno = medias("sleep");
  if (sueno !== null) datos.push({ etiqueta: "Horas de sueno (media del mes)", valor: `${un(sueno)} h` });
  const diasApuntados = new Set(habitos.map((x) => x.day)).size;
  if (diasApuntados > 0) datos.push({ etiqueta: "Dias apuntados este mes", valor: `${diasApuntados} de 30` });

  try {
    const fecha = new Date();
    const bytes = await pdfEstrategia({
      nombre,
      fecha,
      coach: coachPerfil?.trim() || "tu coach",
      fase: esta && actual ? { actual, total: fases.length, titulo: esta.titulo, detalle: esta.detalle ?? null } : null,
      recorrido: fases.map((f) => ({ posicion: f.posicion, titulo: f.titulo })),
      datos,
      bloques,
    });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombreArchivo(nombre, fecha)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[estrategia/pdf]", err);
    return NextResponse.json({ error: "No se pudo generar el PDF." }, { status: 500 });
  }
}

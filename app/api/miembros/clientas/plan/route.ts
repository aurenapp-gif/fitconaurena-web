import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { puedeGestionarClientas } from "@/lib/equipo";
import { isAccessRevoked } from "@/lib/guard";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { sbInsert, sbUpsert, sbSelect, sbUpdate, sbDelete, sbDeleteObject } from "@/lib/supabase";
import { plusOneMonthISO } from "@/lib/profile";
import { semanasValidas } from "@/lib/renovaciones";
import { leerPlan } from "@/lib/planes";
import { sendPlanUpdateEmail } from "@/lib/mailer";
import { sendPushToEmail } from "@/lib/push";
import { verifyPath } from "@/lib/token";
import { validateUpload } from "@/lib/upload";
import { parseEjerciciosTexto } from "@/lib/entreno";
import { sbUpload, safePath } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !(await puedeGestionarClientas(me))) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(me)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  // DOS CAMINOS, a propósito:
  //
  //  · JSON  → el archivo YA está en Storage (subido directo con una URL
  //    firmada) y aquí solo se registra. Es el camino normal y el único que
  //    admite planes grandes.
  //  · FormData → el archivo viaja dentro de la petición, como antes. Se
  //    conserva SOLO como red de seguridad: si la subida directa falla en el
  //    navegador de la coach por lo que sea, un plan pequeño sigue subiendo en
  //    vez de dejarla bloqueada. Aquí sí manda el tope de 4,5 MB de Vercel.
  const esFormulario = (req.headers.get("content-type") ?? "").includes("multipart/form-data");

  let member = "", type = "", title = "", note = "", path = "", ejerciciosTxt = "";
  let semanas: unknown = null;
  let archivo: File | null = null;

  if (esFormulario) {
    let form: FormData;
    try { form = await req.formData(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
    member = normalizeEmail(String(form.get("member") ?? ""));
    type = String(form.get("type") ?? "");
    title = String(form.get("title") ?? "").trim().slice(0, 120);
    note = String(form.get("note") ?? "").trim().slice(0, 1000);
    ejerciciosTxt = String(form.get("exercises") ?? "").slice(0, 4000);
    semanas = form.get("semanas");
    const f = form.get("file");
    if (!(f instanceof File) || f.size === 0) {
      return NextResponse.json({ error: "Adjunta el archivo del plan." }, { status: 400 });
    }
    const invalido = validateUpload(f, "plan");
    if (invalido) return NextResponse.json({ error: invalido }, { status: 400 });
    archivo = f;
  } else {
    let body: { member?: unknown; type?: unknown; title?: unknown; note?: unknown; path?: unknown; pathToken?: unknown; exercises?: unknown; semanas?: unknown };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
    member = normalizeEmail(typeof body.member === "string" ? body.member : "");
    type = typeof body.type === "string" ? body.type : "";
    title = (typeof body.title === "string" ? body.title : "").trim().slice(0, 120);
    note = (typeof body.note === "string" ? body.note : "").trim().slice(0, 1000);
    ejerciciosTxt = (typeof body.exercises === "string" ? body.exercises : "").slice(0, 4000);
    semanas = body.semanas;
    path = typeof body.path === "string" ? body.path : "";
    const pathToken = typeof body.pathToken === "string" ? body.pathToken : "";
    // La ruta tiene que ser una emitida por /sign: si no, cualquiera con sesión
    // de coach podría registrar como plan un archivo arbitrario del almacén.
    if (!path || !verifyPath(path, pathToken)) {
      return NextResponse.json({ error: "La subida no es válida. Vuelve a intentarlo." }, { status: 400 });
    }
  }

  if (!isValidEmail(member)) return NextResponse.json({ error: "Clienta no válida." }, { status: 400 });
  if (type !== "nutricion" && type !== "entrenamiento")
    return NextResponse.json({ error: "Tipo no válido." }, { status: 400 });

  const kind = type === "nutricion" ? "nutrición" : "entrenamiento";

  try {
    // Por el camino de respaldo el archivo llega aquí y se sube desde el
    // servidor; por el normal ya está en Storage y solo falta guardarlo.
    if (archivo) {
      path = safePath(`${type}-${archivo.name || "plan"}`);
      await sbUpload("planes", path, await archivo.arrayBuffer(), archivo.type || "application/octet-stream");
    }
    const row = { member_email: member, type, title: title || null, file_path: path };
    // Los ejercicios solo tienen sentido en un plan de entrenamiento: son los
    // que la clienta rellenará (peso y repeticiones) en cada revisión.
    const exercises = type === "entrenamiento" ? parseEjerciciosTexto(ejerciciosTxt) : [];
    // Solo el entrenamiento tiene duración; la alimentación es siempre mensual.
    const duracion = type === "entrenamiento" ? { semanas: semanasValidas(semanas) } : {};
    let creado: { id?: string } | null = null;
    try {
      creado = await sbInsert<{ id?: string }>("plans", { ...row, ...duracion, note: note || null, exercises: exercises.length ? exercises : null });
    } catch (e) {
      // Si alguna columna todavía no existe (falta ejecutar la migración
      // supabase/plan-comentario.sql o supabase/para-ellas.sql), no bloqueamos
      // la subida: el plan se guarda igual, solo sin ese dato.
      console.error("[clientas/plan] insert completo falló; reintento reducido", e);
      try {
        creado = await sbInsert<{ id?: string }>("plans", { ...row, note: note || null });
      } catch {
        creado = await sbInsert<{ id?: string }>("plans", row);
      }
    }

    // LEER EL PLAN AL SUBIRLO, PERO SIN QUE NADIE ESPERE.
    //
    // Leerlo cuando hacía falta dejaba a la clienta trece segundos mirando una
    // pantalla en blanco al abrir su entreno. Leerlo aquí lo arregló, pero
    // dentro de la respuesta: la coach se quedaba con el botón en «Subiendo…»
    // entre diez y treinta y cinco segundos, cuando el archivo llevaba dos
    // segundos en su sitio. Medido en producción: un plan de dos páginas, 11 s;
    // uno de quince, 19 s.
    //
    // Ahora la lectura sale por detrás: se responde en cuanto el plan está
    // guardado y la plataforma mantiene viva la función hasta que la lectura
    // termina. Si se cortara, no se pierde nada: el plan está subido y la
    // lectura se rehace sola la primera vez que haga falta.
    if (creado?.id) {
      const plan = { id: creado.id, type, file_path: path };
      const lectura = leerPlan(plan)
        .then((l) => console.log(`[clientas/plan] ${type} ${creado?.id}: ${l.estructura ? "leído" : "no se pudo leer"}`))
        .catch((e) => console.error("[clientas/plan] lectura", e));
      try {
        waitUntil(lectura);
      } catch {
        // Fuera de Vercel (en local) no hay a quién pedírselo: el proceso sigue
        // vivo por su cuenta y la lectura termina igual.
      }
    }
    // Renovar el plan reinicia el ciclo: próxima renovación a +1 mes. Además
    // detiene la secuencia de avisos de espera (plan_notice_stage=24).
    await sbUpsert("profiles", {
      email: member,
      renewal_date: plusOneMonthISO(),
      plan_notice_stage: 24,
      plan_ready_notified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[clientas/plan]", err);
    return NextResponse.json({ error: "No se pudo subir el plan." }, { status: 500 });
  }

  // Aviso a la clienta en cuanto se sube el plan (no bloqueante: si falla el
  // envío, el plan ya está subido igualmente). Se avisa SIEMPRE, indicando de
  // qué plan se trata: si se suben nutrición y entrenamiento, llegan los dos
  // avisos y ella sabe exactamente qué hay nuevo.
  const avisos = Promise.all([
    sendPlanUpdateEmail(member, {
      subject: `¡Tu plan de ${kind} ya está disponible! 🎉`,
      heading: "¡Tu plan ya está listo! 🎉",
      message: `Tu coach acaba de subir tu plan de ${kind}. Entra a tu área para verlo y empezar.`,
      cta: "Ver mi plan",
    }).catch((e) => console.error("[clientas/plan] email", e)),
    sendPushToEmail(member, {
      title: "¡Tu plan ya está listo! 🎉",
      body: `Tu plan de ${kind} ya está en tu área privada.`,
      url: "/miembros/perfil",
    }).catch((e) => console.error("[clientas/plan] push", e)),
  ]);
  // Lanzados sin esperar, pero encargados a la plataforma: una función puede
  // congelarse en cuanto responde, y un aviso a medio enviar se pierde sin que
  // nadie se entere.
  try { waitUntil(avisos); } catch { /* en local el proceso sigue vivo */ }

  return NextResponse.json({ ok: true });
}

/**
 * Corrige el TIPO de un plan ya subido. Solo la coach.
 *
 * Al subir se elige nutrición o entrenamiento en un desplegable, y equivocarse
 * es fácil. Sin esto había que borrar el plan y volver a subirlo —con lo que la
 * clienta recibía otro aviso de «tu plan ya está listo» por un archivo que ya
 * tenía—, o dejarlo mal clasificado y que las renovaciones contaran mal.
 *
 * Solo se toca `type`: el archivo no se mueve ni se renombra (su nombre lleva
 * el tipo antiguo, pero es solo un nombre) y NO se avisa a la clienta, porque
 * para ella no cambia nada: el documento es el mismo.
 */
export async function PATCH(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !(await puedeGestionarClientas(me))) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(me)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  let data: { id?: unknown; type?: unknown; member?: unknown };
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }

  const id = typeof data.id === "string" ? data.id.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Plan no válido." }, { status: 400 });
  }

  /*
   * MOVER UN PLAN DE UNA CLIENTA A OTRA.
   *
   * Pasa: dos clientas se llaman parecido y el plan acaba en la ficha
   * equivocada. Hasta ahora la única salida era borrarlo y volver a subirlo,
   * que pierde la lectura del plan —y pagarla otra vez— y la fecha real.
   *
   * Solo la coach, no el equipo: esto saca un plan de la vista de una persona
   * y se lo pone a otra. El archivo no se toca: su ruta en el almacén no
   * lleva el correo dentro, así que basta con cambiar de dueña la ficha.
   */
  if (typeof data.member === "string") {
    if (!isAdmin(me)) return NextResponse.json({ error: "Solo la coach puede mover un plan." }, { status: 403 });
    const destino = normalizeEmail(data.member);
    if (!isValidEmail(destino)) return NextResponse.json({ error: "Clienta no válida." }, { status: 400 });

    let plan: { member_email: string; title: string | null; type: string } | undefined;
    try {
      plan = (await sbSelect<{ member_email: string; title: string | null; type: string }>(
        "plans", `select=member_email,title,type&id=eq.${id}&limit=1`
      ))[0];
    } catch (err) {
      console.error("[clientas/plan] mover: leer", err);
      return NextResponse.json({ error: "No se pudo mover el plan." }, { status: 500 });
    }
    if (!plan) return NextResponse.json({ error: "Ese plan ya no existe." }, { status: 404 });
    if (plan.member_email.toLowerCase() === destino) {
      return NextResponse.json({ error: "Ese plan ya es suyo." }, { status: 400 });
    }

    // La clienta de destino tiene que existir. Un correo mal escrito dejaría
    // el plan en tierra de nadie: no lo vería ni una ni otra.
    try {
      const hay = await sbSelect<{ email: string }>("profiles", `select=email&email=eq.${encodeURIComponent(destino)}&limit=1`);
      if (hay.length === 0) return NextResponse.json({ error: "No hay ninguna clienta con ese correo." }, { status: 404 });
    } catch (err) {
      console.error("[clientas/plan] mover: destino", err);
      return NextResponse.json({ error: "No se pudo mover el plan." }, { status: 500 });
    }

    // Si la primera ya había entrenado con él, sus series quedan apuntadas
    // contra un plan que deja de ser suyo: siguen guardadas, pero ella no las
    // vuelve a ver. Se cuentan y se devuelven para poder avisar antes.
    let sesiones = 0;
    try {
      sesiones = (await sbSelect<{ id: string }>("workout_sessions", `select=id&plan_id=eq.${id}`)).length;
    } catch { /* si la tabla no está, no hay nada que avisar */ }

    try {
      await sbUpdate("plans", `id=eq.${id}`, { member_email: destino });
    } catch (err) {
      console.error("[clientas/plan] mover", err);
      return NextResponse.json({ error: "No se pudo mover el plan." }, { status: 500 });
    }
    console.log(`[clientas/plan] movido ${id} de ${plan.member_email} a ${destino} por ${me}`);
    return NextResponse.json({ ok: true, movido: true, sesiones, titulo: plan.title ?? null });
  }

  const type = data.type;
  if (type !== "nutricion" && type !== "entrenamiento") {
    return NextResponse.json({ error: "Tipo no válido." }, { status: 400 });
  }

  try {
    const filas = await sbSelect<{ id: string }>("plans", `select=id&id=eq.${id}&limit=1`);
    if (filas.length === 0) return NextResponse.json({ error: "Ese plan ya no existe." }, { status: 404 });
    await sbUpdate("plans", `id=eq.${id}`, { type });
  } catch (err) {
    console.error("[clientas/plan] cambiar tipo", err);
    return NextResponse.json({ error: "No se pudo cambiar el tipo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, type });
}

/** Borra un plan subido: primero la fila (deja de verlo la clienta al instante)
 * y después el archivo del bucket. No toca la fecha de renovación ni reactiva
 * los avisos de "estamos preparando tu plan": borrar un archivo mal subido no
 * debe disparar emails automáticos a la clienta. */
export async function DELETE(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  if (await isAccessRevoked(me)) return NextResponse.json({ error: "Tu acceso ya no está activo." }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Plan no válido." }, { status: 400 });
  }

  try {
    const rows = await sbSelect<{ file_path: string | null }>("plans", `select=file_path&id=eq.${id}&limit=1`);
    if (rows.length === 0) return NextResponse.json({ error: "Ese plan ya no existe." }, { status: 404 });
    await sbDelete("plans", `id=eq.${id}`);
    if (rows[0].file_path) await sbDeleteObject("planes", rows[0].file_path);
  } catch (err) {
    console.error("[clientas/plan] delete", err);
    return NextResponse.json({ error: "No se pudo borrar el plan." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

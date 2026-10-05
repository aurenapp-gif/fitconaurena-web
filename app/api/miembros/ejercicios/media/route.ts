import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession, isAdmin } from "@/lib/members";
import { puedeGestionarClientas } from "@/lib/equipo";
import { ejercicioPorId } from "@/lib/catalogo";
import {
  BUCKET_EJERCICIOS, SETUP_SQL, borrarMedios, guardarMedios, idDeYoutube,
} from "@/lib/ejercicios-media";
import { isMissingTable, sbEnsureBucket, sbUpload } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Lo que pesa como mucho una foto de un ejercicio. De sobra para una foto de móvil. */
const MAX_BYTES = 6 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

/** Quién puede tocar los medios: la coach y el equipo. */
async function quien(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !(await puedeGestionarClientas(me))) return null;
  return me;
}

function faltaTabla(err: unknown) {
  return isMissingTable(err)
    ? NextResponse.json({ error: "Falta crear la tabla.", sql: SETUP_SQL }, { status: 400 })
    : null;
}

/** Subir la foto de un ejercicio. */
export async function POST(req: NextRequest) {
  const me = await quien(req);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const id = typeof form?.get("id") === "string" ? String(form.get("id")) : "";
  const archivo = form?.get("imagen");
  if (!ejercicioPorId(id)) return NextResponse.json({ error: "Ese ejercicio no existe." }, { status: 400 });
  if (!(archivo instanceof File)) return NextResponse.json({ error: "Falta la foto." }, { status: 400 });
  if (!TIPOS.includes(archivo.type)) {
    return NextResponse.json({ error: "La foto tiene que ser JPG, PNG o WEBP." }, { status: 400 });
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "La foto pesa demasiado (máximo 6 MB)." }, { status: 400 });
  }

  // El nombre lo pone el servidor y lleva la hora: así cambiar la foto no se
  // queda pillado en la caché del navegador con la anterior.
  const ext = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
  const path = `${id}-${Date.now()}.${ext}`;
  try {
    await sbEnsureBucket(BUCKET_EJERCICIOS);
    await sbUpload(BUCKET_EJERCICIOS, path, await archivo.arrayBuffer(), archivo.type);
    await guardarMedios(id, { image_path: path }, me);
  } catch (err) {
    const aviso = faltaTabla(err);
    if (aviso) return aviso;
    console.error("[ejercicios/media] subir", err);
    return NextResponse.json({ error: "No se pudo guardar la foto." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Poner o quitar el vídeo de un ejercicio. */
export async function PATCH(req: NextRequest) {
  const me = await quien(req);
  if (!me) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { id?: unknown; video?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!ejercicioPorId(id)) return NextResponse.json({ error: "Ese ejercicio no existe." }, { status: 400 });

  const texto = typeof body.video === "string" ? body.video.trim() : "";
  const video = texto ? idDeYoutube(texto) : null;
  if (texto && !video) {
    return NextResponse.json({ error: "Pega el enlace de YouTube del vídeo." }, { status: 400 });
  }

  try {
    await guardarMedios(id, { video_url: video }, me);
  } catch (err) {
    const aviso = faltaTabla(err);
    if (aviso) return aviso;
    console.error("[ejercicios/media] vídeo", err);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, video });
}

/**
 * Quitar la foto y el vídeo. Solo la coach.
 *
 * El equipo sube, no borra: es la misma regla que con las planificaciones.
 */
export async function DELETE(req: NextRequest) {
  const me = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!me || !isAdmin(me)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: { id?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!ejercicioPorId(id)) return NextResponse.json({ error: "Ese ejercicio no existe." }, { status: 400 });

  try {
    await borrarMedios(id);
  } catch (err) {
    const aviso = faltaTabla(err);
    if (aviso) return aviso;
    console.error("[ejercicios/media] borrar", err);
    return NextResponse.json({ error: "No se pudo quitar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

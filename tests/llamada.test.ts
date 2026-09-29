/**
 * El día y la hora de la llamada grupal.
 *
 * Viven en un solo sitio a propósito: cuenta atrás, recordatorios, correos y lo
 * que sabe FitAI salen todos de ahí. La prueba de que eso se respeta es que
 * cambiar la constante cambie los textos, y que no quede ningún día escrito a
 * mano por el camino — que fue justo lo que pasó: quedó un «jueves» suelto en
 * el ejemplo de una votación y parecía que la llamada seguía siendo ese día.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DIA_LLAMADA, HORA_LLAMADA, MINUTO_LLAMADA, TEXTO_DIA_LLAMADA,
  TEXTO_DIA_LLAMADA_SINGULAR, TEXTO_HORA_LLAMADA, proximaLlamada, diaLlamada,
} from "../lib/llamada-grupal";

test("la llamada es los domingos a las 19:30", () => {
  assert.equal(DIA_LLAMADA, "Sun");
  assert.equal(HORA_LLAMADA, 19);
  assert.equal(MINUTO_LLAMADA, 30);
  assert.equal(TEXTO_DIA_LLAMADA, "domingos");
  assert.equal(TEXTO_DIA_LLAMADA_SINGULAR, "domingo");
  assert.equal(TEXTO_HORA_LLAMADA, "19:30");
});

test("la próxima llamada cae en domingo, y a su hora", () => {
  // Un martes cualquiera a mediodía.
  const martes = Date.UTC(2026, 8, 29, 12, 0);
  const t = proximaLlamada(martes);
  assert.match(diaLlamada(t), /^Domingo/, "el siguiente domingo");
  const reloj = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(t));
  assert.equal(reloj, "19:30", "en hora de Madrid, no en la del servidor");
});

test("durante la llamada sigue siendo la de hoy, no la de la semana que viene", () => {
  const domingo2000 = Date.UTC(2026, 9, 4, 18, 0); // 20:00 en Madrid
  assert.match(
    diaLlamada(proximaLlamada(domingo2000)), /^Domingo, 4 de octubre$/,
    "media hora después de empezar sigue siendo la de hoy, no la del domingo que viene"
  );
});

test("no queda ningún día de la semana escrito a mano", () => {
  const raiz = path.join(__dirname, "..");
  const mirar = ["components", "lib", "app", "supabase"];
  const malos: string[] = [];

  const recorre = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { recorre(p); continue; }
      if (!/\.(ts|tsx|sql)$/.test(e.name)) continue;
      // lib/dia.ts es la lista de días de la semana de los planes: ahí sí van.
      if (p.endsWith(path.join("lib", "dia.ts"))) continue;
      const texto = fs.readFileSync(p, "utf8");
      for (const dia of ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]) {
        if (new RegExp(`llamada[^\\n]{0,80}${dia}|${dia}[^\\n]{0,80}llamada`, "i").test(texto)) {
          malos.push(`${path.relative(raiz, p)} (${dia})`);
        }
      }
    }
  };
  mirar.forEach((d) => recorre(path.join(raiz, d)));

  assert.deepEqual(
    malos, [],
    "la llamada no puede llevar un día escrito a mano: sale de lib/llamada-grupal.ts"
  );
});

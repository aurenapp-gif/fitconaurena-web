#!/usr/bin/env python3
"""
Prepara las plantillas de contrato: coge los PDF tal cual salen de Pages y les
añade los campos de formulario que la app necesita para rellenarlos.

POR QUÉ EXISTE ESTO
Los PDF exportados de Pages no tienen ni un solo campo: las casillas del
Anexo II-A son el carácter «☐» dibujado como texto, y los huecos son rayas de
subrayado. Sin campos de verdad, `lib/pdf.ts` no puede marcar nada, y por eso
los contratos firmados hasta ahora salían con las casillas vacías.

Este script NO redibuja el contrato: respeta el diseño original y solo coloca
widgets encima de las posiciones exactas donde ya está el hueco.

TODO SE LOCALIZA POR TEXTO, NUNCA POR COORDENADAS FIJAS. El contrato de 1.897 €
tiene la página 12 desplazada respecto a los otros dos, porque su importe de
cuota ocupa dos líneas. Con coordenadas fijas habría colocado casillas en el
sitio equivocado sin avisar; buscando el texto, cada una cae donde debe en los
tres. Si algún ancla no aparece, el script para en vez de generar una plantilla
silenciosamente mal montada.

Es una herramienta de preparación que se ejecuta a mano cuando cambia el
contrato, no código de la aplicación. La app solo RELLENA los campos que crea.

    python3 scripts/preparar_contratos.py entrada/ salida/

Requiere PyMuPDF (pip install pymupdf).
"""

import sys
import pathlib
import pymupdf

BLANCO = (1, 1, 1)
GRIS = (0.6, 0.6, 0.6)
CAJA = "☐"

# --------------------------------------------------------------- definiciones

# Casillas: nombre del campo → (texto que la identifica, a qué lado está).
# "der" = la casilla está a la IZQUIERDA del texto (el texto va a su derecha).
# "izq" = la casilla está a la DERECHA del texto.
CASILLAS = [
    ("anexo1_recibido",       "Declaro haber recibido",            "der"),
    ("inicio_opcion1",        "OPCIÓN 1 — QUIERO EMPEZAR YA",      "der"),
    ("inicio_opcion2",        "OPCIÓN 2 — PREFIERO ESPERAR",       "der"),
    ("reconoce_perdida",      "RECONOZCO Y ACEPTO",                "der"),
    ("pago_unico",            "A) Pago único",                     "izq"),
    ("pago_financiacion",     "B) Financiación entidad tercera",   "izq"),
    ("pago_cuotas",           "intereses",                         "izq"),
    ("condicion_consumidor",  "Contrato como CONSUMIDOR",          "der"),
    ("condicion_profesional", "Contrato como PROFESIONAL",         "der"),
    ("img_fotos",             "AUTORIZO el uso de mis fotografías", "der"),
    ("img_testimonio",        "AUTORIZO el uso de mi testimonio",  "der"),
    ("img_nombre",            "AUTORIZO que aparezca mi nombre",   "der"),
    ("img_anonimo",           "AUTORIZO únicamente el uso anónimo", "der"),
    ("img_no_autorizo",       "NO AUTORIZO ningún uso",            "der"),
    ("canal_instagram",       "Instagram",                         "izq"),
    ("canal_tiktok",          "TikTok",                            "izq"),
    ("canal_youtube",         "YouTube",                           "izq"),
    ("canal_web",             "Web",                               "izq"),
    ("canal_email",           "Email marketing",                   "izq"),
    ("canal_ads",             "Publicidad de pago",                "izq"),
]

# Anclas que también aparecen en el articulado: se buscan solo en el Anexo III.
SOLO_ANEXO3 = {"A) Pago único", "B) Financiación entidad tercera", "intereses",
               "Contrato como CONSUMIDOR", "Contrato como PROFESIONAL"}

# Campos de texto sobre las rayas de rellenar: nombre → (ancla, cuál de las
# rayas de esa línea, contando desde la izquierda a partir del ancla).
# El último valor es el ámbito de búsqueda:
#   "cliente" → la tabla EL CLIENTE de la página 1. Sus etiquetas (Domicilio,
#               Correo electrónico, Teléfono…) se repiten en la tabla del
#               PRESTADOR que va justo encima, así que hay que acotar.
#   "anexo3"  → la tabla del Anexo III.
#   None      → aparece una sola vez en todo el documento.
TEXTOS = [
    ("nombre_completo",  "Nombre y apellidos",            0, "cliente"),
    ("dni",              "Documento de identidad",        0, "cliente"),
    ("domicilio",        "Domicilio",                     0, "cliente"),
    ("pais",             "País de residencia",            0, "cliente"),
    ("email",            "Correo electrónico",            0, "cliente"),
    ("telefono",         "Teléfono",                      0, "cliente"),
    ("fecha_nacimiento", "Fecha de nacimiento",           0, "cliente"),
    ("lugar_fecha",      "Lugar y fecha:",                0, None),
    ("anexo1_fecha",     "Fecha de entrega del Anexo I:", 0, None),
    ("anexo1_firma",     "Fecha de entrega del Anexo I:", 1, None),
    ("dia_cargo",        "Día de cargo: día",             0, "anexo3"),
    ("nif_empresa",      "NIF/VAT:",                      0, "anexo3"),
]

# «Firma del Cliente: ____  Fecha: ____» aparece en tres anexos distintos. Se
# numeran por orden de página para poder rellenar cada uno por separado.
FIRMAS_ANEXO = ["anexo2", "anexo3b", "anexo4"]

# Texto fijo del plan, igual para las tres modalidades. Se estampa en vez de
# dejar un hueco que nadie rellena.
#
# El plazo de respuesta es de UNA hora hábil, dentro del horario de atención
# (L-V de 9:00 a 18:00): fuera de ese horario no corre. Es un compromiso
# contractual exigible, así que se escribe tal cual se ha pactado.
FIJOS = [
    ("Plan nutricional",        "Incluido  ·  Revisión semanal"),
    ("Plan de entrenamiento",   "Incluido  ·  Revisión semanal  ·  Revisión técnica cada 15 días"),
    ("Sesiones de seguimiento", "Sesiones de soporte de 60 minutos  ·  frecuencia semanal"),
    ("Canal de soporte",        "Plataforma fitconaurena.com y WhatsApp  ·  Horario: L-V, 9:00-18:00"),
    ("Plazo de respuesta",      "1 hora hábil (dentro del horario de atención)"),
]

# --------------------------------------------------------------- utilidades


def buscar_una(doc, texto, solo_pagina=None, desde_y=None):
    """Localiza un texto que debe aparecer UNA sola vez. Devuelve (página, rect).

    `solo_pagina` y `desde_y` acotan la búsqueda. Hacen falta porque el contrato
    repite etiquetas: «Sesiones de seguimiento» sale en el articulado y en la
    tabla del Anexo III, y «Domicilio» o «Teléfono» salen en la tabla del
    PRESTADOR y otra vez en la del CLIENTE, justo debajo.
    """
    paginas = [solo_pagina] if solo_pagina is not None else range(doc.page_count)
    hits = [
        (i, r) for i in paginas for r in doc[i].search_for(texto)
        if desde_y is None or r.y0 >= desde_y
    ]
    if len(hits) != 1:
        dónde = f" en la página {solo_pagina + 1}" if solo_pagina is not None else ""
        raise SystemExit(f"  ✗ «{texto}» aparece {len(hits)} veces{dónde} (esperaba 1)")
    return hits[0]


def caja_junto_a(pagina, rect, lado):
    """La casilla «☐» de la misma línea, al lado indicado y más cercana."""
    centro = (rect.y0 + rect.y1) / 2
    cajas = [
        c for c in pagina.search_for(CAJA)
        if abs((c.y0 + c.y1) / 2 - centro) < 5
        and (c.x1 <= rect.x0 + 2 if lado == "der" else c.x0 >= rect.x1 - 2)
    ]
    if not cajas:
        return None
    # La más pegada al texto.
    return min(cajas, key=lambda c: abs(c.x0 - rect.x0) if lado == "izq" else rect.x0 - c.x1)


def rayas_de_linea(pagina, rect):
    """Huecos de rellenar de la misma línea, a la derecha del ancla.

    Se miden carácter a carácter en vez de buscar «____». Buscando la cadena se
    encuentran grupos de cuatro guiones y quedan sueltos los que sobran al
    final, que luego asoman por debajo del valor rellenado. Con los guiones uno
    a uno el hueco se tapa entero.
    """
    centro = (rect.y0 + rect.y1) / 2
    guiones = []
    for b in pagina.get_text("rawdict")["blocks"]:
        for l in b.get("lines", []):
            for sp in l.get("spans", []):
                for ch in sp.get("chars", []):
                    if ch["c"] != "_":
                        continue
                    cb = pymupdf.Rect(ch["bbox"])
                    if abs((cb.y0 + cb.y1) / 2 - centro) < 5 and cb.x0 >= rect.x1 - 2:
                        guiones.append(cb)
    guiones.sort(key=lambda r: r.x0)
    grupos = []
    for g in guiones:
        if grupos and g.x0 - grupos[-1].x1 < 3:
            grupos[-1] = pymupdf.Rect(grupos[-1].x0, min(grupos[-1].y0, g.y0),
                                      g.x1, max(grupos[-1].y1, g.y1))
        else:
            grupos.append(pymupdf.Rect(g))
    return grupos


def bordes_tabla(pagina):
    """Verticales izquierda (columna de valores) y derecha de la tabla."""
    xs = set()
    for dr in pagina.get_drawings():
        for it in dr["items"]:
            if it[0] == "l" and abs(it[1].x - it[2].x) < 0.5 and abs(it[1].y - it[2].y) > 5:
                xs.add(round(it[1].x, 1))
    xs = sorted(xs)
    if len(xs) < 3:
        raise SystemExit("  ✗ no encuentro los bordes de la tabla del Anexo III")
    return xs[1], xs[-1]


def marcar_borrado(pagina, rect):
    """Marca un trozo de página para BORRARLO de verdad.

    Pintar un rectángulo blanco encima no vale: el texto original sigue en el
    documento y se recupera copiando y pegando o con cualquier extractor. En un
    contrato eso deja dos versiones del mismo dato («Revisiones cada ______
    semanas» debajo de «Revisión semanal»), que es justo la ambigüedad que no
    puede tener. La redacción elimina el contenido del flujo de la página.

    `PDF_REDACT_LINE_ART_NONE` conserva los dibujos: si no, se llevaría por
    delante los bordes de las tablas.
    """
    pagina.add_redact_annot(rect)


def aplicar_borrados(pagina):
    pagina.apply_redactions(
        images=pymupdf.PDF_REDACT_IMAGE_NONE,
        graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
    )


def poner_casilla(pagina, nombre, rect):
    w = pymupdf.Widget()
    w.field_name = nombre
    w.field_type = pymupdf.PDF_WIDGET_TYPE_CHECKBOX
    w.rect = rect
    w.border_color = GRIS
    w.border_width = 0.7
    w.field_value = False
    pagina.add_widget(w)


def poner_texto(pagina, nombre, rect):
    caja = pymupdf.Rect(rect.x0, rect.y0 - 1.5, rect.x1, rect.y1 + 2)
    w = pymupdf.Widget()
    w.field_name = nombre
    w.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
    w.rect = caja
    w.text_fontsize = 9
    w.field_value = ""
    pagina.add_widget(w)


# ------------------------------------------------------------------- proceso


def preparar(origen: pathlib.Path, destino: pathlib.Path):
    doc = pymupdf.open(origen)
    print(f"\n{origen.name}")

    # PRIMERO se localiza TODO, porque los huecos se buscan por su texto y el
    # borrado se lo lleva por delante. Después se borra de una vez, y solo al
    # final se colocan los campos: las redacciones eliminan las anotaciones que
    # pillan por medio, así que los widgets tienen que ir después.
    plan = {"casillas": [], "textos": [], "fijos": []}

    anexo3, _ = buscar_una(doc, "ANEXO III — DESCRIPCIÓN DEL SERVICIO")
    izq, der = bordes_tabla(doc[anexo3])

    # 1) Texto fijo del plan. Solo dentro de la tabla del Anexo III: varias de
    #    estas etiquetas también aparecen en el articulado.
    for etiqueta, valor in FIJOS:
        pag, r = buscar_una(doc, etiqueta, solo_pagina=anexo3)
        # La celda, sin llegar a los bordes: borrarlos dejaría la tabla abierta.
        celda = pymupdf.Rect(izq + 0.8, r.y0 - 2, der - 0.8, r.y1 + 2)
        plan["fijos"].append((pag, celda, valor, r.y1 - 1))

    # 2) Casillas, ancladas a su texto.
    for nombre, ancla, lado in CASILLAS:
        pag, r = buscar_una(doc, ancla, solo_pagina=anexo3 if ancla in SOLO_ANEXO3 else None)
        caja = caja_junto_a(doc[pag], r, lado)
        if caja is None:
            raise SystemExit(f"  ✗ sin casilla junto a «{ancla}» (campo {nombre})")
        plan["casillas"].append((pag, nombre, caja))

    # 3) Campos de texto sobre las rayas.
    pag_cli, r_cli = buscar_una(doc, "en calidad de CLIENTE")
    ambitos = {
        "cliente": {"solo_pagina": pag_cli, "desde_y": r_cli.y1},
        "anexo3": {"solo_pagina": anexo3},
    }
    for nombre, ancla, indice, ambito in TEXTOS:
        pag, r = buscar_una(doc, ancla, **ambitos.get(ambito, {}))
        huecos = rayas_de_linea(doc[pag], r)
        if len(huecos) <= indice:
            raise SystemExit(f"  ✗ «{ancla}» no tiene hueco nº {indice} (campo {nombre})")
        plan["textos"].append((pag, nombre, huecos[indice]))

    # 4) «Firma del Cliente / Fecha» de los tres anexos.
    firmas = [(i, r) for i in range(doc.page_count) for r in doc[i].search_for("Firma del Cliente:")]
    firmas = [f for f in firmas if f[0] >= 10]  # las de los anexos, no la del cuerpo
    if len(firmas) != len(FIRMAS_ANEXO):
        raise SystemExit(f"  ✗ esperaba {len(FIRMAS_ANEXO)} bloques de firma de anexo, hay {len(firmas)}")
    for (pag, r), prefijo in zip(firmas, FIRMAS_ANEXO):
        huecos = rayas_de_linea(doc[pag], r)
        if len(huecos) < 2:
            raise SystemExit(f"  ✗ el bloque de firma de {prefijo} no tiene sus dos huecos")
        plan["textos"].append((pag, f"{prefijo}_firma", huecos[0]))
        plan["textos"].append((pag, f"{prefijo}_fecha", huecos[1]))

    # 5) «Fecha de inicio»: la celda dice «Fecha de alta en la plataforma…».
    pag, r = buscar_una(doc, "Fecha de inicio", solo_pagina=anexo3)
    plan["textos"].append((pag, "fecha_inicio", pymupdf.Rect(izq + 4, r.y0, der - 4, r.y1)))

    # --- Borrado de verdad de todo lo que se sustituye ---
    paginas = set()
    for pag, celda, _, _ in plan["fijos"]:
        marcar_borrado(doc[pag], celda); paginas.add(pag)
    for pag, _, caja in plan["casillas"]:
        marcar_borrado(doc[pag], caja); paginas.add(pag)
    for pag, _, hueco in plan["textos"]:
        marcar_borrado(doc[pag], pymupdf.Rect(hueco.x0, hueco.y0 - 1.5, hueco.x1, hueco.y1 + 2))
        paginas.add(pag)
    for pag in paginas:
        aplicar_borrados(doc[pag])

    # --- Y ahora sí, los campos ---
    for pag, celda, valor, base in plan["fijos"]:
        doc[pag].insert_text((izq + 6, base), valor, fontsize=9, fontname="helv", color=(0, 0, 0))
    for pag, nombre, caja in plan["casillas"]:
        poner_casilla(doc[pag], nombre, caja)
    for pag, nombre, hueco in plan["textos"]:
        poner_texto(doc[pag], nombre, hueco)

    doc.save(destino, garbage=3, deflate=True)
    doc.close()
    print(f"  ✓ {len(plan['casillas'])} casillas · {len(plan['textos'])} campos de texto · {len(plan['fijos'])} textos fijos")


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    ent, sal = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    sal.mkdir(parents=True, exist_ok=True)
    for pdf in sorted(ent.glob("*.pdf")):
        preparar(pdf, sal / pdf.name)


if __name__ == "__main__":
    main()

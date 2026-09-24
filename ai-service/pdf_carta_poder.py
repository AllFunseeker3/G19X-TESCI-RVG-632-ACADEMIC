# ============================================================================
# ARCHIVO: ai-service/pdf_carta_poder.py
# FUNCIÓN GENERAL: genera el PDF de carta poder con formato institucional
#   (lugar/fecha a la derecha, título centrado, cuerpo justificado y firmas).
# FLUJO DE DATOS:
#   - ENTRAN: dict `datos` + `nombre_base` desde main.py (endpoint POST /pdf).
#   - SALEN: archivo PDF en documentos/Sistema legal + dict {archivo, ruta, bytes}.
# QUÉ MODIFICAR SI hay cambios: ajustar estilos en _estilos, layout en
#   generar_carta_poder o carpeta destino vía env PDF_DIR.
# ============================================================================
# ============ AQUÍ EMPIEZA IMPORTS ============
import re
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
# ============ AQUÍ TERMINA IMPORTS ============

# ============ AQUÍ EMPIEZA CONSTANTES ============
MESES = {
    "01": "enero", "02": "febrero", "03": "marzo", "04": "abril",
    "05": "mayo", "06": "junio", "07": "julio", "08": "agosto",
    "09": "septiembre", "10": "octubre", "11": "noviembre", "12": "diciembre",
}

# Párrafo judicial fijo ELIMINADO: ahora el PDF usa datos["parrafo_contextual"]
# generado por IA en main.py según facultades/límites. Fallback coherente abajo.

BASE_DIR = Path(__file__).resolve().parent.parent  # Raíz del proyecto.
PDF_DIR = Path(
    __import__("os").getenv("PDF_DIR", str(BASE_DIR / "documentos" / "Sistema legal"))
)
# ============ AQUÍ TERMINA CONSTANTES ============

# ============ AQUÍ EMPIEZA FUNCIÓN FECHA_LARGA ============
def fecha_larga(v: str) -> str:
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", (v or "").strip())  # Solo acepta DD/MM/AAAA.
    if not m:
        return v or ""
    dd, mm, aa = m.groups()
    return f"{int(dd)} de {MESES.get(mm, mm)} de {aa}"
# ============ AQUÍ TERMINA FUNCIÓN FECHA_LARGA ============

# ============ AQUÍ EMPIEZA FUNCIÓN ESTILOS ============
def _estilos():
    base = ParagraphStyle("base", fontName="Times-Roman", fontSize=12, leading=18)
    return {
        "base": base,
        "der": ParagraphStyle("der", parent=base, alignment=2),  # derecha
        "cen": ParagraphStyle("cen", parent=base, alignment=1),  # centrado
        "jus": ParagraphStyle("jus", parent=base, alignment=4),  # justificado
        "titulo": ParagraphStyle(
            "titulo", parent=base, alignment=1, fontName="Times-Bold",
            fontSize=14, leading=20, spaceAfter=14,
        ),
        "firma": ParagraphStyle("firma", parent=base, alignment=1, fontSize=11, leading=15),
    }
# ============ AQUÍ TERMINA FUNCIÓN ESTILOS ============

# ============ AQUÍ EMPIEZA FUNCIÓN BLOQUE_FIRMA ============
def _bloque_firma(nombre: str, doc: str, rol: str, sub: str):
    e = _estilos()
    return [
        HRFlowable(width="90%", thickness=1, hAlign="CENTER", spaceAfter=4),  # Línea de firma.
        Paragraph(f"<b>{rol}</b>", e["firma"]),
        Paragraph(f"<i>{sub}</i>", e["firma"]),
        Spacer(1, 0.2 * cm),
        Paragraph(nombre or "", e["firma"]),
        Paragraph(doc or "", e["firma"]),
    ]
# ============ AQUÍ TERMINA FUNCIÓN BLOQUE_FIRMA ============

# ============ AQUÍ EMPIEZA FUNCIÓN GENERAR_CARTA_PODER ============
def generar_carta_poder(datos: dict, nombre_base: str = "carta-poder") -> dict:
    """Genera el PDF con el machote oficial. Devuelve {archivo, ruta, bytes}."""
    d = datos or {}
    e = _estilos()
    PDF_DIR.mkdir(parents=True, exist_ok=True)  # Crea carpeta si no existe.

    sello = datetime.now().strftime("%Y%m%d-%H%M%S")  # Evita colisiones de nombre.
    limpio = re.sub(r"[^a-zA-Z0-9_-]+", "-", (nombre_base or "carta-poder")).strip("-")  # Sanitiza nombre.
    archivo = f"{limpio}-{sello}.pdf"
    ruta = PDF_DIR / archivo

    otorgante = d.get("otorgante", "")
    apoderado = d.get("apoderado", "")
    doc_otorgante = f"{d.get('tipoDocOtorgante', '')} {d.get('idOtorgante', '')}".strip()
    doc_apoderado = f"{d.get('tipoDocApoderado', '')} {d.get('idApoderado', '')}".strip()
    destinatario = (d.get("destinatario") or "").strip() or "A quien corresponda"
    lugar = d.get("lugar", "")
    fecha = fecha_larga(d.get("fecha", ""))
    facultades = d.get("facultades", "")
    limites = d.get("limites", "")
    vigencia = d.get("vigencia") or "el tiempo necesario para el objeto del poder"
    # Párrafo contextual de IA; fallback coherente (no judicial) si viene vacío.
    parrafo = (d.get("parrafo_contextual") or "").strip() or (
        f"Asimismo, para que realice todos los actos y gestiones necesarios para {facultades}, "
        f"dentro de los siguientes límites: {limites}, ratificando desde hoy todo lo que haga sobre este particular."
        if facultades or limites else
        "Asimismo, para que realice todos los actos necesarios para el objeto de este poder, ratificando desde hoy todo lo que haga sobre este particular."
    )

    doc = SimpleDocTemplate(
        str(ruta), pagesize=letter,
        leftMargin=2.2 * cm, rightMargin=2.2 * cm,
        topMargin=2.0 * cm, bottomMargin=2.0 * cm,
        title="Carta Poder", author="SisLegal",
    )
    estilo_tabla = TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ])
    historia = [
        # Título centrado como en el machote.
        Paragraph("CARTA PODER", e["titulo"]),
        Spacer(1, 0.3 * cm),
        # Lugar y fecha a la derecha + etiqueta pequeña.
        Paragraph(f"{lugar}, a {fecha}", e["der"]),
        Paragraph("<font size=9><i>Lugar y fecha de expedición</i></font>", e["der"]),
        Spacer(1, 0.5 * cm),
        # Destinatario + PRESENTE.
        Paragraph(f"<b>{destinatario}</b>", e["jus"]),
        Paragraph("PRESENTE:", e["jus"]),
        Spacer(1, 0.4 * cm),
        # Otorgamiento: otorgante -> apoderado + gestión/trámite.
        Paragraph(
            f"Por medio del presente, otorgo poder especial, amplio y suficiente para que "
            f"en mi nombre y representación, el C. <b>{apoderado}</b> comparezca ante usted "
            f"a fin de que realice la siguiente gestión o trámite:",
            e["jus"],
        ),
        Spacer(1, 0.3 * cm),
        Paragraph(f"<b>{facultades}</b>", e["jus"]),
        HRFlowable(width="100%", thickness=1, hAlign="CENTER", spaceAfter=6, spaceBefore=6),
        Paragraph(f"Límites del poder: {limites}", e["jus"]),
        Paragraph(f"Vigencia del poder: {vigencia}", e["jus"]),
        Paragraph(f"Otorgante: {otorgante} ({doc_otorgante}). Apoderado: {apoderado} ({doc_apoderado}).", e["jus"]),
        Spacer(1, 0.4 * cm),
        # Párrafo Asimismo CONTEXTUAL (viene de IA según facultades/límites).
        Paragraph(parrafo, e["jus"]),
        Spacer(1, 0.8 * cm),
        Paragraph("Atentamente", e["cen"]),
        Spacer(1, 1.2 * cm),
        KeepTogether([
            Table(
                [[
                    _bloque_firma(
                        otorgante, doc_otorgante,
                        "OTORGO", "Firma y nombre de quien otorga el poder",
                    ),
                    _bloque_firma(
                        apoderado, doc_apoderado,
                        "ACEPTO", "Firma y nombre de quien recibe el poder",
                    ),
                ]],
                colWidths=[7.5 * cm, 7.5 * cm],
                style=estilo_tabla,
            ),
        ]),
        Spacer(1, 1.2 * cm),
        KeepTogether([
            Table(
                [[
                    _bloque_firma(
                        d.get("testigo1Nombre", ""),
                        f"{d.get('testigo1TipoDoc', '')} {d.get('testigo1Id', '')}".strip(),
                        "TESTIGO", "(firma y nombre)",
                    ),
                    _bloque_firma(
                        d.get("testigo2Nombre", ""),
                        f"{d.get('testigo2TipoDoc', '')} {d.get('testigo2Id', '')}".strip(),
                        "TESTIGO", "(firma y nombre)",
                    ),
                ]],
                colWidths=[7.5 * cm, 7.5 * cm],
                style=estilo_tabla,
            ),
        ]),
    ]
    doc.build(historia)  # Escribe el PDF en disco.
    return {"archivo": archivo, "ruta": str(ruta), "bytes": ruta.stat().st_size}
# ============ AQUÍ TERMINA FUNCIÓN GENERAR_CARTA_PODER ============

# ============ AQUÍ EMPIEZA FUNCIÓN GENERAR PDF GENÉRICO ============
def generar_pdf_generico(titulo: str, datos: dict, contenido: str, nombre_base: str = "documento") -> dict:
    """PDF institucional genérico para los 10 tipos no carta-poder.
    Usa la redacción IA (contenido) como cuerpo + lugar/fecha y firma genérica."""
    d = datos or {}
    e = _estilos()
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    sello = datetime.now().strftime("%Y%m%d-%H%M%S")
    limpio = re.sub(r"[^a-zA-Z0-9_-]+", "-", (nombre_base or "documento")).strip("-")
    archivo = f"{limpio}-{sello}.pdf"
    ruta = PDF_DIR / archivo
    lugar = d.get("lugar", "")
    fecha = fecha_larga(d.get("fecha", ""))
    cuerpo = (contenido or "").strip()
    if not cuerpo:
        # Fallback: si no llegó la redacción IA (proxy sin reiniciar o IA saturada),
        # construye el cuerpo desde los datos para no dejar el PDF vacío.
        partes = []
        for k, v in d.items():
            if v is None or v == "" or v is False or k in ("lugar", "fecha"):
                continue
            if isinstance(v, list):
                v = ", ".join([str(x) for x in v if str(x).strip()])
                if not v:
                    continue
            partes.append(f"{k}: {v}")
        cuerpo = "\n\n".join(partes) or "Documento generado con los datos capturados."
    # Divide el cuerpo IA en párrafos justificados.
    bloques = [b.strip() for b in cuerpo.split("\n\n") if b.strip()] or [cuerpo]
    doc = SimpleDocTemplate(
        str(ruta), pagesize=letter,
        leftMargin=2.2 * cm, rightMargin=2.2 * cm,
        topMargin=2.0 * cm, bottomMargin=2.0 * cm,
        title=titulo or "Documento", author="SisLegal",
    )
    historia = [
        Paragraph((titulo or "DOCUMENTO").upper(), e["titulo"]),
        Spacer(1, 0.3 * cm),
    ]
    if lugar or fecha:
        historia += [
            Paragraph(f"{lugar}, a {fecha}", e["der"]),
            Spacer(1, 0.5 * cm),
        ]
    for b in bloques:
        historia += [Paragraph(b.replace("\n", "<br/>"), e["jus"]), Spacer(1, 0.3 * cm)]
    historia += [
        Spacer(1, 0.5 * cm),
        Paragraph("Atentamente", e["cen"]),
        Spacer(1, 1.2 * cm),
        HRFlowable(width="55%", thickness=1, hAlign="CENTER", spaceAfter=4),
        Paragraph("Firma", e["firma"]),
    ]
    doc.build(historia)
    return {"archivo": archivo, "ruta": str(ruta), "bytes": ruta.stat().st_size}
# ============ AQUÍ TERMINA FUNCIÓN GENERAR PDF GENÉRICO ============

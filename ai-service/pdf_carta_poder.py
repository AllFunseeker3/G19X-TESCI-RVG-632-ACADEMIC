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
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
)
# ============ AQUÍ TERMINA IMPORTS ============

# ============ AQUÍ EMPIEZA CONSTANTES ============
MESES = {
    "01": "enero", "02": "febrero", "03": "marzo", "04": "abril",
    "05": "mayo", "06": "junio", "07": "julio", "08": "agosto",
    "09": "septiembre", "10": "octubre", "11": "noviembre", "12": "diciembre",
}

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
def _bloque_firma(nombre: str, doc: str, rol: str):
    e = _estilos()
    return [
        Paragraph(f"<b>{rol}</b>", e["firma"]),
        Spacer(1, 1.6 * cm),  # Espacio para firma manuscrita.
        HRFlowable(width="80%", thickness=1, hAlign="CENTER", spaceAfter=4),  # Línea de firma.
        Paragraph(nombre or "", e["firma"]),
        Paragraph(doc or "", e["firma"]),
    ]
# ============ AQUÍ TERMINA FUNCIÓN BLOQUE_FIRMA ============

# ============ AQUÍ EMPIEZA FUNCIÓN GENERAR_CARTA_PODER ============
def generar_carta_poder(datos: dict, nombre_base: str = "carta-poder") -> dict:
    """Genera el PDF y lo guarda. Devuelve {archivo, ruta, bytes}."""
    d = datos or {}
    e = _estilos()
    PDF_DIR.mkdir(parents=True, exist_ok=True)  # Crea carpeta si no existe.

    sello = datetime.now().strftime("%Y%m%d-%H%M%S")  # Evita colisiones de nombre.
    limpio = re.sub(r"[^a-zA-Z0-9_-]+", "-", (nombre_base or "carta-poder")).strip("-")  # Sanitiza nombre.
    archivo = f"{limpio}-{sello}.pdf"
    ruta = PDF_DIR / archivo

    otorgante = d.get("otorgante", "")
    apoderado = d.get("apoderado", "")
    destinatario = (d.get("destinatario") or "").strip() or "a quien corresponda"
    lugar = d.get("lugar", "")
    fecha = fecha_larga(d.get("fecha", ""))

    doc = SimpleDocTemplate(
        str(ruta), pagesize=letter,
        leftMargin=2.8 * cm, rightMargin=2.8 * cm,
        topMargin=2.2 * cm, bottomMargin=2.2 * cm,
        title="Carta Poder", author="SisLegal",
    )
    historia = [
        Paragraph(f"{lugar}, a {fecha}", e["der"]),
        Spacer(1, 0.8 * cm),
        Paragraph("<u>CARTA PODER</u>", e["titulo"]),
        Paragraph(f"Estimado(a) {destinatario},", e["jus"]),
        Spacer(1, 0.4 * cm),
        Paragraph(
            f"Por la presente, yo, <b>{otorgante}</b> "
            f"({d.get('tipoDocOtorgante', '')} {d.get('idOtorgante', '')}), "
            f"otorgo poder al señor(a) <b>{apoderado}</b> "
            f"({d.get('tipoDocApoderado', '')} {d.get('idApoderado', '')}), "
            f"mi representante legal, para actuar en mi nombre en: "
            f"{d.get('facultades', '')}",
            e["jus"],
        ),
        Spacer(1, 0.4 * cm),
        Paragraph("Este poder se otorga con los siguientes límites:", e["jus"]),
        Paragraph(f"{d.get('limites', '')}", e["jus"]),
        Spacer(1, 0.4 * cm),
        Paragraph(
            "El poder otorgado en esta carta es válido desde la fecha de "
            f"emisión hasta {d.get('vigencia') or 'el tiempo necesario para el objeto del poder'}.",
            e["jus"],
        ),
        Spacer(1, 0.8 * cm),
        Paragraph("Atentamente,", e["jus"]),
        Spacer(1, 1.0 * cm),
        Table(
            [
                _bloque_firma(
                    otorgante,
                    f"{d.get('tipoDocOtorgante', '')} {d.get('idOtorgante', '')}".strip(),
                    "Otorgante",
                ),
                _bloque_firma(
                    apoderado,
                    f"{d.get('tipoDocApoderado', '')} {d.get('idApoderado', '')}".strip(),
                    "Apoderado",
                ),
            ],
            colWidths=[7.5 * cm, 7.5 * cm],
        ),
        Spacer(1, 1.0 * cm),
        Paragraph("<b>Testigos</b>", e["cen"]),
        Spacer(1, 0.5 * cm),
        Table(
            [
                _bloque_firma(
                    d.get("testigo1Nombre", ""),
                    f"{d.get('testigo1TipoDoc', '')} {d.get('testigo1Id', '')}".strip(),
                    "Testigo 1",
                ),
                _bloque_firma(
                    d.get("testigo2Nombre", ""),
                    f"{d.get('testigo2TipoDoc', '')} {d.get('testigo2Id', '')}".strip(),
                    "Testigo 2",
                ),
            ],
            colWidths=[7.5 * cm, 7.5 * cm],
        ),
    ]
    doc.build(historia)  # Escribe el PDF en disco.
    return {"archivo": archivo, "ruta": str(ruta), "bytes": ruta.stat().st_size}
# ============ AQUÍ TERMINA FUNCIÓN GENERAR_CARTA_PODER ============

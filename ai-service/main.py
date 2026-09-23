# ============================================================================
# ARCHIVO: ai-service/main.py
# FUNCIÓN GENERAL: microservicio IA (FastAPI + LangChain + OpenRouter).
#   Expone POST /redactar y POST /pdf (piloto: solo carta-poder).
# FLUJO DE DATOS:
#   - ENTRAN: JSON { id_tipo, datos } desde server/routes/ia.js (proxy /api/ia).
#   - SALEN: { contenido, modelo, id_tipo } o { archivo, ruta, bytes } al backend.
# QUÉ MODIFICAR SI hay cambios: agregar plantillas en PLANTILLAS y su prompt;
#   cambiar modelo/puerto en ai-service/.env (IA_MODEL, IA_PORT).
# ============================================================================
# ============ AQUÍ EMPIEZA IMPORTS ============
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel
# ============ AQUÍ TERMINA IMPORTS ============

# ============ AQUÍ EMPIEZA CONFIGURACIÓN ============
load_dotenv()  # Lee ai-service/.env (nunca en git).

API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = os.getenv("IA_MODEL", "")
PORT = int(os.getenv("IA_PORT", "8001"))
# ============ AQUÍ TERMINA CONFIGURACIÓN ============

# ============ AQUÍ EMPIEZA APP Y CORS ============
app = FastAPI(title="SisLegal IA")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ============ AQUÍ TERMINA APP Y CORS ============

# ============ AQUÍ EMPIEZA MODELOS DE ENTRADA ============
class RedactarIn(BaseModel):
    id_tipo: str
    datos: dict


class PdfIn(BaseModel):
    id_tipo: str
    datos: dict
    nombre_base: str = "carta-poder"
# ============ AQUÍ TERMINA MODELOS DE ENTRADA ============

# ============ AQUÍ EMPIEZA PLANTILLAS ============
PROMPT_CARTA_PODER = PromptTemplate.from_template(
    "Eres un abogado mexicano experto en redacción de documentos legales. "
    "Redacta una CARTA PODER formal en español, lista para firmar, usando "
    "EXCLUSIVAMENTE los siguientes datos (si un dato opcional falta, omítelo "
    "sin inventar información):\n\n"
    "Otorgante: {otorgante} ({tipoDocOtorgante} {idOtorgante}). {ayuda_otorgante}\n"
    "Apoderado: {apoderado} ({tipoDocApoderado} {idApoderado}).\n"
    "Facultades: {facultades}\n"
    "Límites: {limites}\n"
    "Testigo 1: {testigo1Nombre} ({testigo1TipoDoc} {testigo1Id})\n"
    "Testigo 2: {testigo2Nombre} ({testigo2TipoDoc} {testigo2Id})\n"
    "Vigencia: {vigencia}\n"
    "Lugar y fecha de firma: {lugar}, {fecha}\n\n"
    "Estructura: encabezado, declaración del otorgante, facultades, límites, "
    "vigencia, lugar/fecha y bloques de firma (otorgante, apoderado, 2 testigos). "
    "Tono solemne y preciso. Devuelve SOLO el texto del documento."
)

PLANTILLAS = {"carta-poder": PROMPT_CARTA_PODER}  # Piloto: solo carta-poder.
# ============ AQUÍ TERMINA PLANTILLAS ============

# ============ AQUÍ EMPIEZA FUNCIÓN GET_LLM ============
def get_llm() -> ChatOpenAI:
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Falta OPENROUTER_API_KEY en ai-service/.env")
    if not MODEL:
        raise HTTPException(status_code=500, detail="Falta IA_MODEL en ai-service/.env")
    return ChatOpenAI(
        model=MODEL,
        api_key=API_KEY,
        base_url="https://openrouter.ai/api/v1",  # Endpoint compatible OpenAI.
        default_headers={"HTTP-Referer": "http://localhost:5173", "X-Title": "SisLegal"},
    )
# ============ AQUÍ TERMINA FUNCIÓN GET_LLM ============

# ============ AQUÍ EMPIEZA ENDPOINT GET SALUD ============
@app.get("/salud")
def salud():
    return {"ok": True, "modelo": MODEL, "plantillas": sorted(PLANTILLAS)}
# ============ AQUÍ TERMINA ENDPOINT GET SALUD ============

# ============ AQUÍ EMPIEZA ENDPOINT POST REDACTAR ============
@app.post("/redactar")
def redactar(body: RedactarIn):
    plantilla = PLANTILLAS.get(body.id_tipo)
    if plantilla is None:
        raise HTTPException(
            status_code=400,
            detail=f"Plantilla no implementada para '{body.id_tipo}' (piloto: carta-poder)",
        )
    d = body.datos or {}
    prompt = plantilla.format(
        otorgante=d.get("otorgante", ""),
        tipoDocOtorgante=d.get("tipoDocOtorgante", ""),
        idOtorgante=d.get("idOtorgante", ""),
        ayuda_otorgante="Datos según identificación oficial.",
        apoderado=d.get("apoderado", ""),
        tipoDocApoderado=d.get("tipoDocApoderado", ""),
        idApoderado=d.get("idApoderado", ""),
        facultades=d.get("facultades", ""),
        limites=d.get("limites", ""),
        testigo1Nombre=d.get("testigo1Nombre", ""),
        testigo1TipoDoc=d.get("testigo1TipoDoc", ""),
        testigo1Id=d.get("testigo1Id", ""),
        testigo2Nombre=d.get("testigo2Nombre", ""),
        testigo2TipoDoc=d.get("testigo2TipoDoc", ""),
        testigo2Id=d.get("testigo2Id", ""),
        vigencia=d.get("vigencia") or "el tiempo necesario para el objeto del poder",  # Valor por defecto.
        lugar=d.get("lugar", ""),
        fecha=d.get("fecha", ""),
    )
    llm = get_llm()
    try:
        resp = llm.invoke(prompt)
    except Exception as e:
        msg = str(e)
        # Modelo gratis saturado en el pool compartido -> 429 para reintentar.
        if "429" in msg or "rate-limited" in msg or "rate limit" in msg.lower():
            raise HTTPException(
                status_code=429,
                detail="Modelo saturado en OpenRouter (pool gratis). Espera un minuto "
                "y reintenta, o cambia IA_MODEL en ai-service/.env",
            )
        raise HTTPException(status_code=502, detail=f"Error del proveedor IA: {msg[:300]}")  # Recorta mensaje.
    return {"contenido": resp.content, "modelo": MODEL, "id_tipo": body.id_tipo}
# ============ AQUÍ TERMINA ENDPOINT POST REDACTAR ============

# ============ AQUÍ EMPIEZA ENDPOINT POST PDF ============
@app.post("/pdf")
def generar_pdf(body: PdfIn):
    """Genera el PDF con formato institucional y lo guarda en
    documentos/Sistema legal. Piloto: solo carta-poder."""
    if body.id_tipo != "carta-poder":
        raise HTTPException(
            status_code=400,
            detail=f"PDF no implementado para '{body.id_tipo}' (piloto: carta-poder)",
        )
    try:
        from pdf_carta_poder import generar_carta_poder  # Import tardío: solo se usa aquí.
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo cargar el generador PDF: {e}")
    try:
        out = generar_carta_poder(body.datos or {}, body.nombre_base)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo generar el PDF: {e}")
    return {**out, "id_tipo": body.id_tipo}
# ============ AQUÍ TERMINA ENDPOINT POST PDF ============

# ============ AQUÍ EMPIEZA ARRANQUE ============
if __name__ == "__main__":
    import uvicorn  # Import local: solo para ejecución directa.

    uvicorn.run(app, host="127.0.0.1", port=PORT)  # Arranque: uvicorn main:app --port 8001.
# ============ AQUÍ TERMINA ARRANQUE ============

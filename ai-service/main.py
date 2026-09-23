# ============================================================================
# SERVICIO IA SisLegal (FastAPI + LangChain + OpenRouter).
# POST /redactar { id_tipo, datos } -> { contenido, modelo, id_tipo }.
# Plantillas: solo carta-poder (piloto); otros tipos -> 400.
# ENV (ai-service/.env, nunca en git): OPENROUTER_API_KEY, IA_MODEL, IA_PORT.
# ARRANQUE: uvicorn main:app --port 8001  (desde ai-service/)
# ============================================================================
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL = os.getenv("IA_MODEL", "")
PORT = int(os.getenv("IA_PORT", "8001"))

app = FastAPI(title="SisLegal IA")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RedactarIn(BaseModel):
    id_tipo: str
    datos: dict


class PdfIn(BaseModel):
    id_tipo: str
    datos: dict
    nombre_base: str = "carta-poder"


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

PLANTILLAS = {"carta-poder": PROMPT_CARTA_PODER}


def get_llm() -> ChatOpenAI:
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Falta OPENROUTER_API_KEY en ai-service/.env")
    if not MODEL:
        raise HTTPException(status_code=500, detail="Falta IA_MODEL en ai-service/.env")
    return ChatOpenAI(
        model=MODEL,
        api_key=API_KEY,
        base_url="https://openrouter.ai/api/v1",
        default_headers={"HTTP-Referer": "http://localhost:5173", "X-Title": "SisLegal"},
    )


@app.get("/salud")
def salud():
    return {"ok": True, "modelo": MODEL, "plantillas": sorted(PLANTILLAS)}


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
        vigencia=d.get("vigencia") or "el tiempo necesario para el objeto del poder",
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
        raise HTTPException(status_code=502, detail=f"Error del proveedor IA: {msg[:300]}")
    return {"contenido": resp.content, "modelo": MODEL, "id_tipo": body.id_tipo}


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
        from pdf_carta_poder import generar_carta_poder
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo cargar el generador PDF: {e}")
    try:
        out = generar_carta_poder(body.datos or {}, body.nombre_base)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo generar el PDF: {e}")
    return {**out, "id_tipo": body.id_tipo}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=PORT)

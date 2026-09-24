# ============================================================================
# ARCHIVO: ai-service/main.py
# FUNCIÓN GENERAL: microservicio IA (FastAPI + LangChain + OpenRouter/Google).
#   Expone POST /redactar y POST /pdf para los 11 tipos (cartas, oficios, avisos, notificaciones).
# FLUJO DE DATOS:
#   - ENTRAN: JSON { id_tipo, datos } desde server/routes/ia.js (proxy /api/ia).
#   - SALEN: { contenido, modelo, id_tipo } o { archivo, ruta, bytes } al backend.
# QUÉ MODIFICAR SI hay cambios: agregar plantillas en PLANTILLAS y su prompt;
#   cambiar modelo/puerto en ai-service/.env (IA_MODEL, IA_PORT, IA_PROVIDER).
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
# Lista fallback: IA_MODEL puede ser "m1,m2,m3" (prueba en orden).
MODELOS = [m.strip() for m in (MODEL or "").split(",") if m.strip()]
PORT = int(os.getenv("IA_PORT", "8001"))
# Nuevo proveedor: openrouter (default) | google (Gemini directo).
IA_PROVIDER = os.getenv("IA_PROVIDER", "openrouter").strip().lower()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
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
    contenido: str = ""  # Redacción IA (si el front la manda, el PDF genérico la usa como cuerpo).
# ============ AQUÍ TERMINA MODELOS DE ENTRADA ============

# ============ AQUÍ EMPIEZA PLANTILLAS ============
# Formato CARTA PODER (estructura fija, contenido contextual).
# Estructura: título, lugar/fecha derecha, destinatario+PRESENTE,
# otorgamiento + facultades + límites + vigencia,
# párrafo "Asimismo..." CONTEXTUAL a facultades/límites (NO fijo judicial),
# Atentamente + firmas OTORGO/ACEPTO + TESTIGO/TESTIGO.
PROMPT_CARTA_PODER = PromptTemplate.from_template(
    "Eres un abogado mexicano experto en redacción de documentos legales. "
    "Redacta una CARTA PODER formal en español con EXACTAMENTE este formato, "
    "sin agregar ni quitar secciones, sin explicaciones fuera del documento:\n\n"
    "CARTA PODER\n\n"
    "{lugar}, a {fecha}\n"
    "Lugar y fecha de expedición\n\n"
    "{destinatario}\n"
    "PRESENTE:\n\n"
    "Por medio del presente, otorgo poder especial, amplio y suficiente para que "
    "en mi nombre y representación, el C. {apoderado} comparezca ante usted a fin "
    "de que realice la siguiente gestión o trámite:\n"
    "{facultades}\n\n"
    "Límites del poder: {limites}\n"
    "Vigencia del poder: {vigencia}\n\n"
    "Otorgante: {otorgante} ({tipoDocOtorgante} {idOtorgante}). "
    "Apoderado: {apoderado} ({tipoDocApoderado} {idApoderado}).\n\n"
    "Redacta ahora UN párrafo que empiece con 'Asimismo...' con las acciones "
    "estrictamente necesarias para cumplir esas facultades dentro de esos límites "
    "(firmar, gestionar, recoger, presentar, etc.). PROHIBIDO meter juicios, demandas, "
    "amparos, embargos o árbitros salvo que las facultades sean expresamente judiciales. "
    "Máximo 110 palabras, coherente con el objeto del poder.\n\n"
    "Atentamente\n\n"
    "OTORGO\nFirma y nombre de quien otorga el poder: {otorgante}\n\n"
    "ACEPTO\nFirma y nombre de quien recibe el poder: {apoderado}\n\n"
    "TESTIGO\nFirma y nombre: {testigo1Nombre} ({testigo1TipoDoc} {testigo1Id})\n\n"
    "TESTIGO\nFirma y nombre: {testigo2Nombre} ({testigo2TipoDoc} {testigo2Id})\n\n"
    "Lugar y fecha de firma: {lugar}, {fecha}.\n\n"
    "Datos para llenar el formato:\n"
    "Destinatario: {destinatario}\n"
    "Otorgante: {otorgante} ({tipoDocOtorgante} {idOtorgante})\n"
    "Apoderado: {apoderado} ({tipoDocApoderado} {idApoderado})\n"
    "Facultades: {facultades}\n"
    "Límites: {limites}\n"
    "Testigo 1: {testigo1Nombre} ({testigo1TipoDoc} {testigo1Id})\n"
    "Testigo 2: {testigo2Nombre} ({testigo2TipoDoc} {testigo2Id})\n"
    "Vigencia: {vigencia}\n"
    "Lugar: {lugar}\nFecha: {fecha}\n\n"
    "Reglas: usa EXCLUSIVAMENTE estos datos (si un opcional falta, omítelo sin inventar). "
    "OBLIGATORIO formalizar: si facultades/límites vienen en lenguaje coloquial "
    "('lana', 'clavarse', 'sacar', faltas de ortografía o minúsculas), tradúcelos a "
    "lenguaje jurídico mexicano solemne ('recursos económicos', 'apropiarse', 'retirar/disponer'), "
    "corrige ortografía y pon mayúscula inicial. No dejes coloquialismos tal cual. "
    "Tono solemne y preciso. Devuelve SOLO el texto del documento con ese formato."
)

PLANTILLAS = {"carta-poder": PROMPT_CARTA_PODER}  # Específica; el resto usa prompt genérico.
# ============ AQUÍ TERMINA PLANTILLAS ============

# ============ AQUÍ EMPIEZA CATÁLOGO IA 11 TIPOS ============
# Nombres y estructura por tipo para redacción genérica (cartas, oficios, avisos, notificaciones).
TIPOS_IA = {
    "carta-poder": "Carta Poder",
    "carta-responsiva": "Carta Responsiva",
    "carta-renuncia": "Carta de Renuncia",
    "carta-intencion": "Carta de Intención",
    "oficio-peticion": "Oficio de Petición",
    "oficio-comision": "Oficio de Comisión",
    "oficio-resolucion": "Oficio de Resolución",
    "aviso-privacidad": "Aviso de Privacidad",
    "aviso-rescision": "Aviso de Rescisión Laboral",
    "aviso-funcionamiento": "Aviso de Funcionamiento",
    "notificacion-general": "Notificación Legal General",
}

ESTRUCTURAS_IA = {
    "carta-responsiva": "Título CARTA RESPONSIVA, lugar/fecha, quien entrega (nombre, ID, puesto) y quien recibe (nombre, ID), datos del bien (tipo, descripción, marca, modelo, serie, estado físico, valor estimado), condiciones de uso y resguardo, firmas de entrega y recepción.",
    "carta-renuncia": "Título CARTA DE RENUNCIA, lugar/fecha, empleado (nombre, número, puesto, empresa), último día laborable, motivo (y detalle si es Otro), agradecimiento breve, firma del empleado.",
    "carta-intencion": "Título CARTA DE INTENCIÓN, lugar/fecha, parte emisora y receptora (nombre/RFC/ID y representantes), objeto/propósito, cláusulas de confidencialidad y carácter vinculante solo si se marcaron, vigencia, firmas de ambas partes.",
    "oficio-peticion": "Encabezado OFICIO DE PETICIÓN con folio y asunto, lugar/fecha, destinatario (nombre, cargo, dependencia) + PRESENTE, remitente (nombre, cargo), petición formal con fundamento en Art. 8 solo si se marcó, C.c.p. solo si se marcó, anexos si hay, firma del remitente.",
    "oficio-comision": "Encabezado OFICIO DE COMISIÓN con folio, lugar/fecha emisión, comisionado (nombre, cargo, número empleado), destino, fechas inicio/fin, motivo, quien comisiona (nombre, cargo), viáticos y monto solo si se marcaron, firma de quien comisiona.",
    "oficio-resolucion": "Encabezado OFICIO DE RESOLUCIÓN con folio, lugar/fecha, destinatario (nombre, cargo), antecedentes (oficio origen, interesado, asunto), considerandos, puntos resolutivos (PRIMERO/SEGUNDO...), sentido (Favorable/No favorable/Parcial), autoridad que resuelve (nombre, cargo) y firma.",
    "aviso-privacidad": "Título AVISO DE PRIVACIDAD (tipo Integral/Simplificado/Corto), razón social y domicilio, datos recabados, finalidad, transferencia solo si se marcó (a quién y para qué), contacto ARCO, fecha de actualización.",
    "aviso-rescision": "Título AVISO DE RESCISIÓN, lugar/fecha aviso y fecha rescisión, trabajador (nombre, número, puesto), causa detallada, fundamento Art. 47 solo si se indicó, representante (nombre, cargo) y firma.",
    "aviso-funcionamiento": "Título AVISO DE FUNCIONAMIENTO, autoridad destino + PRESENTE, establecimiento (razón social, RFC, giro, domicilio), responsable, horario solo si se indicó, fecha apertura y fecha aviso, firma del responsable.",
    "notificacion-general": "Título NOTIFICACIÓN, lugar/fecha, destinatario y domicilio, expediente solo si se indicó, quien notifica (nombre, cargo), extracto formal del acto notificado, acuse de recibo (Nombre/Firma/Fecha/Hora) solo si se marcó, firma de quien notifica.",
}

PROMPT_GENERICO = PromptTemplate.from_template(
    "Eres un abogado mexicano experto en redacción de documentos legales. "
    "Redacta en español formal y solemne el documento {tipo_nombre} con esta estructura: {estructura}\n\n"
    "Datos (usa EXCLUSIVAMENTE estos, si un opcional falta omítelo sin inventar):\n{datos_txt}\n\n"
    "Reglas: formaliza coloquialismos a jurídico ('lana'->'recursos económicos', 'clavarse'->'apropiarse', "
    "'sacar'->'retirar/disponer', 'meter lana'->'invertir recursos'), corrige ortografía y mayúsculas. "
    "Coherente con el objeto del documento, sin meter juicios/amparos/embargos salvo que los datos sean judiciales. "
    "Devuelve SOLO el texto del documento, sin explicaciones."
)
# ============ AQUÍ TERMINA CATÁLOGO IA 11 TIPOS ============

# ============ AQUÍ EMPIEZA FUNCIÓN GET_LLM ============
def get_llm(modelo: str = ""):
    nombre = (modelo or MODEL).strip()
    if not nombre:
        raise HTTPException(status_code=500, detail="Falta IA_MODEL en ai-service/.env")
    # Proveedor Google/Gemini directo (langchain-google-genai).
    if IA_PROVIDER in ("google", "gemini"):
        if not GOOGLE_API_KEY:
            raise HTTPException(status_code=500, detail="Falta GOOGLE_API_KEY en ai-service/.env")
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI  # Import tardío: solo se usa aquí.
        except Exception:
            raise HTTPException(
                status_code=500,
                detail="Falta dependencia langchain-google-genai (pip install -r requirements.txt)",
            )
        return ChatGoogleGenerativeAI(
            model=nombre,  # Ej. gemini-3.6-flash, gemini-2.5-flash.
            google_api_key=GOOGLE_API_KEY,
        )
    # Default: OpenRouter vía endpoint compatible OpenAI.
    if not API_KEY:
        raise HTTPException(status_code=500, detail="Falta OPENROUTER_API_KEY en ai-service/.env")
    return ChatOpenAI(
        model=nombre,
        api_key=API_KEY,
        base_url="https://openrouter.ai/api/v1",  # Endpoint compatible OpenAI.
        default_headers={"HTTP-Referer": "http://localhost:5173", "X-Title": "SisLegal"},
    )
# ============ AQUÍ TERMINA FUNCIÓN GET_LLM ============

# ============ AQUÍ EMPIEZA ENDPOINT GET SALUD ============
@app.get("/salud")
def salud():
    return {"ok": True, "proveedor": IA_PROVIDER, "modelo": MODEL, "plantillas": sorted(TIPOS_IA)}
# ============ AQUÍ TERMINA ENDPOINT GET SALUD ============

# ============ AQUÍ EMPIEZA HELPERS REDACCIÓN ============
def _datos_txt(datos: dict) -> str:
    """Convierte el dict de datos a texto 'clave: valor' para el prompt genérico."""
    lineas = []
    for k, v in (datos or {}).items():
        if v is None or v == "" or v is False:
            continue
        if isinstance(v, list):
            v = ", ".join([str(x) for x in v if str(x).strip()])
            if not v:
                continue
        lineas.append(f"{k}: {v}")
    return "\n".join(lineas) or "(sin datos)"


def _invocar_con_fallback(prompt: str) -> tuple:
    """Invoca al LLM probando la lista MODELOS en orden. Devuelve (contenido, modelo_ok)."""
    modelos_intento = MODELOS or [MODEL]
    ultimo_error = ""
    for m in modelos_intento:
        try:
            llm = get_llm(m)
            resp = llm.invoke(prompt)
            return (resp.content, m)
        except Exception as e:
            msg = str(e)
            ultimo_error = msg
            reintentable = any(k in msg for k in ("429", "503", "UNAVAILABLE", "NOT_FOUND", "rate-limited", "rate limit", "ResourceExhausted", "high demand", "overloaded"))
            if not reintentable:
                raise HTTPException(status_code=502, detail=f"Error del proveedor IA: {msg[:300]}")
            continue
    raise HTTPException(
        status_code=429,
        detail=f"Todos los modelos saturados ({', '.join(modelos_intento)}). Espera un minuto y reintenta. Detalle: {ultimo_error[:200]}",
    )
# ============ AQUÍ TERMINA HELPERS REDACCIÓN ============

# ============ AQUÍ EMPIEZA ENDPOINT POST REDACTAR ============
@app.post("/redactar")
def redactar(body: RedactarIn):
    if body.id_tipo not in TIPOS_IA:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo no soportado '{body.id_tipo}' (11 tipos: {', '.join(sorted(TIPOS_IA))})",
        )
    d = body.datos or {}
    # Carta poder mantiene su machote específico con formato exacto.
    if body.id_tipo == "carta-poder":
        plantilla = PLANTILLAS.get("carta-poder")
        prompt = plantilla.format(
            destinatario=(d.get("destinatario") or "").strip() or "A quien corresponda",
            otorgante=d.get("otorgante", ""),
            tipoDocOtorgante=d.get("tipoDocOtorgante", ""),
            idOtorgante=d.get("idOtorgante", ""),
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
    else:
        prompt = PROMPT_GENERICO.format(
            tipo_nombre=TIPOS_IA[body.id_tipo],
            estructura=ESTRUCTURAS_IA.get(body.id_tipo, "Documento formal con título, lugar/fecha, datos y firmas."),
            datos_txt=_datos_txt(d),
        )
    contenido, modelo_ok = _invocar_con_fallback(prompt)
    return {"contenido": contenido, "modelo": modelo_ok, "id_tipo": body.id_tipo}
# ============ AQUÍ TERMINA ENDPOINT POST REDACTAR ============

# ============ AQUÍ EMPIEZA ENDPOINT POST PDF ============
def _formalizar_campos(facultades: str, limites: str) -> tuple:
    """Formaliza facultades/límites + genera párrafo Asimismo contextual en 1 llamada.
    Devuelve (facultades, limites, parrafo). Si falla, devuelve originales + fallback coherente."""
    f = (facultades or "").strip()
    li = (limites or "").strip()
    fallback_parrafo = (
        f"Asimismo, para que realice todos los actos y gestiones necesarios para {f}, "
        f"dentro de los siguientes límites: {li}, ratificando desde hoy todo lo que haga sobre este particular."
        if f or li else
        "Asimismo, para que realice todos los actos necesarios para el objeto de este poder, ratificando desde hoy todo lo que haga sobre este particular."
    )
    if not f and not li:
        return f, li, fallback_parrafo
    modelos_intento = MODELOS or [MODEL]
    prompt = (
        "Eres un abogado mexicano. Formaliza a lenguaje jurídico solemne, corrige ortografía, "
        "sin cambiar el sentido. Coloquialismos: 'lana'->'recursos económicos', 'meter lana'->'invertir recursos', "
        "'sacar'->'retirar/disponer', 'clavarse'->'apropiarse'. Marcas descritas tradúcelas: "
        "'marca de juguetes que hacen los carros de llantas calientes'->'Mattel (Hot Wheels)'. "
        "Además redacta un párrafo Asimismo CONTEXTUAL (máx 110 palabras, solo acciones necesarias "
        "para esas facultades dentro de esos límites; PROHIBIDO juicios/demandas/amparos/embargos salvo "
        "facultades judiciales). Devuelve EXACTAMENTE 3 líneas:\n"
        f"FACULTADES: {f}\n"
        f"LIMITES: {li}\n"
        "PARRAFO: Asimismo, ...\n"
        "Solo esas 3 líneas, sin comillas ni explicación."
    )
    for m in modelos_intento:
        try:
            llm = get_llm(m)
            resp = llm.invoke(prompt)
            txt = (resp.content or "").strip()
            fac_out, lim_out, par_out = f, li, fallback_parrafo
            for linea in txt.splitlines():
                l = linea.strip()
                if l.upper().startswith("FACULTADES:"):
                    v = l.split(":", 1)[1].strip().strip('"').strip("'")
                    if v:
                        fac_out = v
                elif l.upper().startswith("LIMITES:"):
                    v = l.split(":", 1)[1].strip().strip('"').strip("'")
                    if v:
                        lim_out = v
                elif l.upper().startswith("PARRAFO:"):
                    v = l.split(":", 1)[1].strip()
                    if v:
                        par_out = v
            if "FACULTADES:" in txt.upper() and "LIMITES:" in txt.upper():
                return fac_out, lim_out, par_out
        except Exception:
            continue
    return f, li, fallback_parrafo


@app.post("/pdf")
def generar_pdf(body: PdfIn):
    """Genera el PDF con formato institucional y lo guarda en
    documentos/Sistema legal. Carta-poder usa machote; los otros 10 usan PDF genérico con la redacción IA."""
    if body.id_tipo not in TIPOS_IA:
        raise HTTPException(status_code=400, detail=f"Tipo no soportado '{body.id_tipo}'")
    try:
        from pdf_carta_poder import generar_carta_poder, generar_pdf_generico  # Import tardío.
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo cargar el generador PDF: {e}")
    try:
        datos = dict(body.datos or {})
        if body.id_tipo == "carta-poder":
            
            # facultades/límites + genera párrafo Asimismo contextual en 1 llamada.
            fac, lim, parrafo = _formalizar_campos(datos.get("facultades", ""), datos.get("limites", ""))
            datos["facultades"] = fac
            datos["limites"] = lim
            datos["parrafo_contextual"] = parrafo
            out = generar_carta_poder(datos, body.nombre_base)
        else:
            out = generar_pdf_generico(
                TIPOS_IA[body.id_tipo], datos, body.contenido, body.nombre_base or body.id_tipo
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"No se pudo generar el PDF: {e}")
    return {**out, "id_tipo": body.id_tipo}
# ============ AQUÍ TERMINA ENDPOINT POST PDF ============

# ============ AQUÍ EMPIEZA ARRANQUE ============
if __name__ == "__main__":
    import uvicorn  # Import local: solo para ejecución directa.

    uvicorn.run(app, host="127.0.0.1", port=PORT)  # Arranque: uvicorn main:app --port 8001.
# ============ AQUÍ TERMINA ARRANQUE ============

// ============================================================================
// ARCHIVO: server/routes/ia.js
// FUNCIÓN GENERAL: proxy autenticado hacia el microservicio IA (FastAPI).
//   El front nunca habla con la IA directo (la clave vive en ai-service/.env).
// FLUJO DE DATOS:
//   - ENTRAN: POST /api/ia/redactar|/pdf desde el front + IA_URL/PDF_DIR de env.
//   - SALEN: reenvío a ai-service (:8001) y registro en tabla adjuntos si hay id.
// QUÉ MODIFICAR SI hay cambios: cambiar IA_URL si se mueve ai-service;
//   agregar validación de permiso por tipo aquí si se requiere.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const { conAuth } = require("../middleware");
const { docVisible } = require("./documentos");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA ROUTER Y CONFIG ============
const router = express.Router();
router.use(conAuth); // Todas exigen login.

const IA_URL = process.env.IA_URL || "http://127.0.0.1:8001";
// Carpeta donde ai-service guarda los PDF (misma que PDF_DIR por defecto).
const PDF_DIR =
  process.env.PDF_DIR ||
  path.join(__dirname, "..", "..", "documentos", "Sistema legal");
// ============ AQUÍ TERMINA ROUTER Y CONFIG ============

// ============ AQUÍ EMPIEZA CONTROL DE PDFS RECIENTES ============
// El PDF se genera antes de crear/adjuntar el documento. Para que el usuario
// que lo pidió pueda descargarlo sin abrir la descarga a cualquier sesión,
// se recuerda (en memoria, 10 min) quién generó cada archivo.
const PDF_RECIENTE_MS = 10 * 60 * 1000;
const pdfsRecientes = new Map(); // archivo -> { idUsuario, expira }

function recordarPdf(archivo, idUsuario) {
  const nombre = String(archivo || "");
  if (!nombre) return;
  for (const [k, v] of pdfsRecientes) {
    if (v.expira < Date.now()) pdfsRecientes.delete(k);
  }
  pdfsRecientes.set(nombre, { idUsuario, expira: Date.now() + PDF_RECIENTE_MS });
}

function pdfRecienteDe(archivo, idUsuario) {
  const datos = pdfsRecientes.get(archivo);
  if (!datos) return false;
  if (datos.expira < Date.now()) {
    pdfsRecientes.delete(archivo);
    return false;
  }
  return datos.idUsuario === idUsuario;
}

// QUÉ HACE: autoriza la descarga si el archivo está adjunto a un documento
// visible para el usuario (misma regla de área/permiso que /api/documentos).
async function puedeVerPdfAdjunto(archivo, usuario) {
  const [filas] = await pool.query(
    "SELECT id_documento FROM adjuntos WHERE nombre_archivo = ? ORDER BY id_adjunto DESC",
    [archivo]
  );
  for (const f of filas) {
    try {
      await docVisible(f.id_documento, usuario, "ver");
      return true;
    } catch (e) {
      if (e.status !== 403 && e.status !== 404) throw e; // 403/404: prueba otro adjunto.
    }
  }
  return false;
}
// ============ AQUÍ TERMINA CONTROL DE PDFS RECIENTES ============

// ============ AQUÍ EMPIEZA HELPER ENRIQUECER DESTINATARIO ============
// QUÉ HACE: si carta-poder viene sin destinatario pero con cliente vinculado,
// usa el nombre del cliente (así la empresa sí aparece en el machote).
// Solo carta-poder: en otros tipos el destinatario tiene otro sentido.
async function enriquecerDestinatario(idTipo, datos) {
  try {
    if (idTipo !== "carta-poder" || typeof datos !== "object" || !datos) return datos;
    if ((datos.destinatario ?? "").toString().trim() || !datos.id_cliente) return datos;
    const [[c]] = await pool.query(
      "SELECT nombre FROM clientes WHERE id_cliente = ? AND activo = TRUE",
      [datos.id_cliente]
    );
    if (c?.nombre) return { ...datos, destinatario: c.nombre };
    return datos;
  } catch {
    return datos; // Si falla, la IA usa "A quien corresponda" como antes.
  }
}
// ============ AQUÍ TERMINA HELPER ENRIQUECER DESTINATARIO ============

// ============ AQUÍ EMPIEZA RUTA POST REDACTAR ============
// POST /api/ia/redactar { id_tipo, datos } -> { contenido, modelo, id_tipo }.
// Pasa el código de estado del servicio IA (400 plantilla, 429 saturado, 502).
router.post("/redactar", async (req, res, next) => {
  try {
    const { id_tipo, datos } = req.body || {};
    if (!id_tipo || typeof datos !== "object") {
      return res.status(400).json({ detail: "Faltan id_tipo y datos" });
    }
    const datosFinal = await enriquecerDestinatario(id_tipo, datos);
    let r;
    try {
      r = await fetch(`${IA_URL}/redactar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_tipo, datos: datosFinal }),
      });
    } catch {
      return res.status(503).json({ detail: "Servicio IA apagado (ai-service en :8001)" });
    }
    const cuerpo = await r.json().catch(() => ({})); // Tolerante a no-JSON.
    return res.status(r.status).json(cuerpo); // Propaga status de la IA.
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA POST REDACTAR ============

// ============ AQUÍ EMPIEZA RUTA POST CORREGIR ============
// POST /api/ia/corregir { contenido, instruccion, id_tipo? } -> { contenido, modelo }.
// Aplica la retro del usuario al texto del preview sin regenerar desde cero.
router.post("/corregir", async (req, res, next) => {
  try {
    const { contenido, instruccion, id_tipo = "" } = req.body || {};
    if (!contenido || !instruccion) {
      return res.status(400).json({ detail: "Faltan contenido e instruccion" });
    }
    let r;
    try {
      r = await fetch(`${IA_URL}/corregir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido, instruccion, id_tipo }),
      });
    } catch {
      return res.status(503).json({ detail: "Servicio IA apagado (ai-service en :8001)" });
    }
    const cuerpo = await r.json().catch(() => ({}));
    return res.status(r.status).json(cuerpo);
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA POST CORREGIR ============

// ============ AQUÍ EMPIEZA RUTA POST PDF ============
// POST /api/ia/pdf { id_tipo, datos, contenido?, id_documento?, nombre_base? } ->
// { archivo, bytes, id_adjunto? }. Genera el PDF en documentos/Sistema legal
// y, si viene id_documento, lo registra en adjuntos (CHECK solo-PDF).
router.post("/pdf", async (req, res, next) => {
  try {
    const { id_tipo, datos, contenido = "", id_documento = null, nombre_base } = req.body || {};
    if (!id_tipo || typeof datos !== "object") {
      return res.status(400).json({ detail: "Faltan id_tipo y datos" });
    }
    // IDOR: si el PDF se va a adjuntar, primero se valida que el documento
    // exista y que el usuario tenga permiso de modificarlo.
    let idDoc = null;
    if (id_documento !== null && id_documento !== undefined && id_documento !== "") {
      idDoc = Number(id_documento);
      if (!Number.isInteger(idDoc) || idDoc <= 0) {
        return res.status(400).json({ detail: "id_documento inválido" });
      }
      await docVisible(idDoc, req.usuario, "modificar");
    }
    const datosFinal = await enriquecerDestinatario(id_tipo, datos);
    let r;
    try {
      r = await fetch(`${IA_URL}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_tipo, datos: datosFinal, contenido, nombre_base: nombre_base || id_tipo }),
      });
    } catch {
      return res.status(503).json({ detail: "Servicio IA apagado (ai-service en :8001)" });
    }
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(cuerpo); // Propaga error de la IA.
    recordarPdf(cuerpo.archivo, req.usuario.id);
    let idAdjunto = null;
    if (idDoc) {
      // ADJ-01 versionado: anteriores a histórico + nuevo como vigente, en transacción.
      const connex = await pool.getConnection();
      try {
        await connex.beginTransaction();
        await connex.query("UPDATE adjuntos SET vigente = FALSE WHERE id_documento = ?", [idDoc]);
        const [ins] = await connex.query(
          `INSERT INTO adjuntos
           (id_documento, nombre_archivo, tipo_mime, tamano_bytes, ruta, vigente, id_subido_por)
           VALUES (?, ?, 'application/pdf', ?, ?, TRUE, ?)`,
          [idDoc, cuerpo.archivo, cuerpo.bytes ?? null, cuerpo.ruta, req.usuario.id] // ?? tolera falta de bytes.
        );
        await connex.commit();
        idAdjunto = ins.insertId;
      } catch (eTx) {
        await connex.rollback();
        throw eTx;
      } finally {
        connex.release();
      }
    }
    return res.json({ ...cuerpo, id_adjunto: idAdjunto });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA POST PDF ============

// ============ AQUÍ EMPIEZA RUTA POST REVISAR PDF EXTERNO ============
// POST /api/ia/revisar (multipart archivo=PDF) -> { id_tipo, nombre_tipo,
// confianza, datos, veredicto, hallazgos, mensaje, modelo }.
// Solo analiza: clasifica entre los 11 tipos, extrae datos y revisa.
// No crea documentos.
const subidaRevision = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.pdf$/i.test(file.originalname || "") || file.mimetype === "application/pdf";
    cb(ok ? null : new Error("Solo se permiten archivos PDF"), ok);
  },
});
router.post("/revisar", (req, res, next) => {
  subidaRevision.single("archivo")(req, res, async (errMul) => {
    if (errMul) return res.status(400).json({ detail: errMul.message || "PDF inválido" });
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ detail: "Sube un PDF en el campo archivo" });
      }
      const fd = new FormData();
      fd.append("archivo", new Blob([req.file.buffer], { type: "application/pdf" }), req.file.originalname || "carta.pdf");
      let r;
      try {
        r = await fetch(`${IA_URL}/revisar-pdf`, { method: "POST", body: fd });
      } catch {
        return res.status(503).json({ detail: "Servicio IA apagado (ai-service en :8001)" });
      }
      const cuerpo = await r.json().catch(() => ({}));
      return res.status(r.status).json(cuerpo);
    } catch (e) {
      return next(e);
    }
  });
});
// ============ AQUÍ TERMINA RUTA POST REVISAR PDF EXTERNO ============

// ============ AQUÍ EMPIEZA RUTA GET DESCARGAR PDF ============
// GET /api/ia/pdf/:archivo — descarga el PDF (solo dentro de la carpeta,
// sin rutas). Requiere login.
router.get("/pdf/:archivo", async (req, res, next) => {
  try {
    const nombre = path.basename(String(req.params.archivo || "")); // Evita path traversal.
    if (!/^[\w][\w\-.]*\.pdf$/i.test(nombre)) {
      return res.status(400).json({ detail: "Nombre de archivo inválido" });
    }
    // Autorización: adjunto de un documento visible o PDF generado por este
    // mismo usuario en los últimos 10 min. Nunca basta con estar autenticado.
    const autorizado =
      (await puedeVerPdfAdjunto(nombre, req.usuario)) ||
      pdfRecienteDe(nombre, req.usuario.id);
    if (!autorizado) {
      return res.status(404).json({ detail: "PDF inexistente" });
    }
    const ruta = path.join(PDF_DIR, nombre);
    if (!fs.existsSync(ruta)) {
      return res.status(404).json({ detail: "PDF inexistente" });
    }
    return res.download(ruta, nombre, { dotfiles: "deny" });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET DESCARGAR PDF ============

// ============ AQUÍ EMPIEZA EXPORTS ============
module.exports = router;
// ============ AQUÍ TERMINA EXPORTS ============

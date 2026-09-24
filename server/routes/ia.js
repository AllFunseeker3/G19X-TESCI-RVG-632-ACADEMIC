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
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const { conAuth } = require("../middleware");
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

// ============ AQUÍ EMPIEZA RUTA POST REDACTAR ============
// POST /api/ia/redactar { id_tipo, datos } -> { contenido, modelo, id_tipo }.
// Pasa el código de estado del servicio IA (400 plantilla, 429 saturado, 502).
router.post("/redactar", async (req, res, next) => {
  try {
    const { id_tipo, datos } = req.body || {};
    if (!id_tipo || typeof datos !== "object") {
      return res.status(400).json({ detail: "Faltan id_tipo y datos" });
    }
    let r;
    try {
      r = await fetch(`${IA_URL}/redactar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_tipo, datos }),
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
    let r;
    try {
      r = await fetch(`${IA_URL}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_tipo, datos, contenido, nombre_base: nombre_base || id_tipo }),
      });
    } catch {
      return res.status(503).json({ detail: "Servicio IA apagado (ai-service en :8001)" });
    }
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(cuerpo); // Propaga error de la IA.
    let idAdjunto = null;
    if (id_documento) {
      const [ins] = await pool.query(
        `INSERT INTO adjuntos
         (id_documento, nombre_archivo, tipo_mime, tamano_bytes, ruta, id_subido_por)
         VALUES (?, ?, 'application/pdf', ?, ?, ?)`,
        [id_documento, cuerpo.archivo, cuerpo.bytes ?? null, cuerpo.ruta, req.usuario.id] // ?? tolera falta de bytes.
      );
      idAdjunto = ins.insertId;
    }
    return res.json({ ...cuerpo, id_adjunto: idAdjunto });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA POST PDF ============

// ============ AQUÍ EMPIEZA RUTA GET DESCARGAR PDF ============
// GET /api/ia/pdf/:archivo — descarga el PDF (solo dentro de la carpeta,
// sin rutas). Requiere login.
router.get("/pdf/:archivo", async (req, res, next) => {
  try {
    const nombre = path.basename(String(req.params.archivo || "")); // Evita path traversal.
    if (!/^[\w][\w\-.]*\.pdf$/i.test(nombre)) {
      return res.status(400).json({ detail: "Nombre de archivo inválido" });
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

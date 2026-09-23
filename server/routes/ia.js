// ============================================================================
// RUTAS: /api/ia — proxy autenticado hacia el microservicio IA (FastAPI).
// El front nunca habla con la IA directo (la clave OpenRouter vive en
// ai-service/.env). Requiere login; el permiso de crear se valida por tipo.
// ENV: IA_URL (default http://127.0.0.1:8001).
// ============================================================================
const express = require("express");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const { conAuth } = require("../middleware");

const router = express.Router();
router.use(conAuth);

const IA_URL = process.env.IA_URL || "http://127.0.0.1:8001";
// Carpeta donde ai-service guarda los PDF (misma que PDF_DIR por defecto).
const PDF_DIR =
  process.env.PDF_DIR ||
  path.join(__dirname, "..", "..", "documentos", "Sistema legal");

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
    const cuerpo = await r.json().catch(() => ({}));
    return res.status(r.status).json(cuerpo);
  } catch (e) {
    return next(e);
  }
});

// POST /api/ia/pdf { id_tipo, datos, id_documento?, nombre_base? } ->
// { archivo, bytes, id_adjunto? }. Genera el PDF en documentos/Sistema legal
// y, si viene id_documento, lo registra en adjuntos (CHECK solo-PDF).
router.post("/pdf", async (req, res, next) => {
  try {
    const { id_tipo, datos, id_documento = null, nombre_base } = req.body || {};
    if (!id_tipo || typeof datos !== "object") {
      return res.status(400).json({ detail: "Faltan id_tipo y datos" });
    }
    let r;
    try {
      r = await fetch(`${IA_URL}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_tipo, datos, nombre_base: nombre_base || id_tipo }),
      });
    } catch {
      return res.status(503).json({ detail: "Servicio IA apagado (ai-service en :8001)" });
    }
    const cuerpo = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json(cuerpo);
    let idAdjunto = null;
    if (id_documento) {
      const [ins] = await pool.query(
        `INSERT INTO adjuntos
         (id_documento, nombre_archivo, tipo_mime, tamano_bytes, ruta, id_subido_por)
         VALUES (?, ?, 'application/pdf', ?, ?, ?)`,
        [id_documento, cuerpo.archivo, cuerpo.bytes ?? null, cuerpo.ruta, req.usuario.id]
      );
      idAdjunto = ins.insertId;
    }
    return res.json({ ...cuerpo, id_adjunto: idAdjunto });
  } catch (e) {
    return next(e);
  }
});

// GET /api/ia/pdf/:archivo — descarga el PDF (solo dentro de la carpeta,
// sin rutas). Requiere login.
router.get("/pdf/:archivo", async (req, res, next) => {
  try {
    const nombre = path.basename(String(req.params.archivo || ""));
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

module.exports = router;

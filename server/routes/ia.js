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
    let idAdjunto = null;
    if (id_documento) {
      // ADJ-01 versionado: anteriores a histórico + nuevo como vigente, en transacción.
      const connex = await pool.getConnection();
      try {
        await connex.beginTransaction();
        await connex.query("UPDATE adjuntos SET vigente = FALSE WHERE id_documento = ?", [id_documento]);
        const [ins] = await connex.query(
          `INSERT INTO adjuntos
           (id_documento, nombre_archivo, tipo_mime, tamano_bytes, ruta, vigente, id_subido_por)
           VALUES (?, ?, 'application/pdf', ?, ?, TRUE, ?)`,
          [id_documento, cuerpo.archivo, cuerpo.bytes ?? null, cuerpo.ruta, req.usuario.id] // ?? tolera falta de bytes.
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

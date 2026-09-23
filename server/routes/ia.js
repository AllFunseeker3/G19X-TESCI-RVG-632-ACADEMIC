// ============================================================================
// RUTAS: /api/ia — proxy autenticado hacia el microservicio IA (FastAPI).
// El front nunca habla con la IA directo (la clave OpenRouter vive en
// ai-service/.env). Requiere login; el permiso de crear se valida por tipo.
// ENV: IA_URL (default http://127.0.0.1:8001).
// ============================================================================
const express = require("express");
const { conAuth } = require("../middleware");

const router = express.Router();
router.use(conAuth);

const IA_URL = process.env.IA_URL || "http://127.0.0.1:8001";

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

module.exports = router;

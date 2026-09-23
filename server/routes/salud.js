// ============================================================================
// RUTA: GET /api/salud — ping de BD + conteos (sin datos sensibles, sin auth).
// Sirve para comprobar la conexión desde el front o test-conexion.js.
// ============================================================================
const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/salud — { ok, mariadb, conteos }.
router.get("/salud", async (_req, res, next) => {
  try {
    const [[v]] = await pool.query("SELECT VERSION() AS v");
    const conteos = {};
    for (const tabla of [
      "tipos_documento",
      "campos_tipo",
      "permisos_rol",
      "usuarios",
    ]) {
      const [[f]] = await pool.query(`SELECT COUNT(*) AS n FROM ${tabla}`);
      conteos[tabla] = f.n;
    }
    return res.json({ ok: true, mariadb: v.v, conteos });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

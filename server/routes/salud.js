// ============================================================================
// ARCHIVO: server/routes/salud.js
// FUNCIÓN GENERAL: ping de BD + conteos (sin datos sensibles, sin auth).
//   Healthcheck público para el front y diagnósticos.
// FLUJO DE DATOS:
//   - ENTRAN: tablas tipos_documento, campos_tipo, permisos_rol, usuarios.
//   - SALEN: { ok, mariadb, conteos } hacia quien consulte /api/salud.
// QUÉ MODIFICAR SI hay cambios: agregar tablas al conteo si crecen los seeds.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const express = require("express");
const pool = require("../db");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA ROUTER ============
const router = express.Router();
// ============ AQUÍ TERMINA ROUTER ============

// ============ AQUÍ EMPIEZA RUTA GET SALUD ============
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
      const [[f]] = await pool.query(`SELECT COUNT(*) AS n FROM ${tabla}`); // Tabla de lista fija interna.
      conteos[tabla] = f.n;
    }
    return res.json({ ok: true, mariadb: v.v, conteos });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET SALUD ============

// ============ AQUÍ EMPIEZA EXPORTS ============
module.exports = router;
// ============ AQUÍ TERMINA EXPORTS ============

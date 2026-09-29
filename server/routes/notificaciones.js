// ============================================================================
// ARCHIVO: server/routes/notificaciones.js
// FUNCIÓN GENERAL: campanita de avisos (una fila por destinatario).
//   El back inserta avisos en POST /api/documentos (supers del área + admins);
//   aquí el front los lee y los marca como leídos.
// FLUJO DE DATOS:
//   - ENTRAN: requests autenticados + tabla notificaciones.
//   - SALEN: { notificaciones, no_leidas } hacia CentroNotificaciones.jsx.
// QUÉ MODIFICAR SI hay cambios: agregar más tipos insertando filas con otro
//   `tipo`; el front ya muestra título/detalle/hace-cuánto genéricos.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const express = require("express");
const pool = require("../db");
const { conAuth } = require("../middleware");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA ROUTER ============
const router = express.Router();
router.use(conAuth); // Todas exigen login.
// ============ AQUÍ TERMINA ROUTER ============

// ============ AQUÍ EMPIEZA RUTA GET MIS NOTIFICACIONES ============
// GET /api/notificaciones?limite=10&solo_no_leidas=0 ->
// { notificaciones: [...], no_leidas: N }. Solo las del usuario (token).
router.get("/", async (req, res, next) => {
  try {
    const lim = Math.min(Number(req.query.limite) || 10, 50); // Tope 50.
    const solo = String(req.query.solo_no_leidas ?? "0") === "1";
    let q = `SELECT id_notificacion AS id, tipo, titulo, detalle,
                    id_documento, leida, creado_en
             FROM notificaciones WHERE id_usuario = ?`;
    const args = [req.usuario.id];
    if (solo) q += " AND leida = FALSE";
    q += " ORDER BY creado_en DESC LIMIT ?";
    args.push(lim);
    const [filas] = await pool.query(q, args);
    const [[c]] = await pool.query(
      "SELECT COUNT(*) AS n FROM notificaciones WHERE id_usuario = ? AND leida = FALSE",
      [req.usuario.id]
    );
    return res.json({ notificaciones: filas, no_leidas: c.n });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET MIS NOTIFICACIONES ============

// ============ AQUÍ EMPIEZA RUTA PATCH LEER TODAS ============
// PATCH /api/notificaciones/leer-todas — marca todas las mías como leídas.
// OJO: va ANTES de /:id para que Express no la confunda con un id.
router.patch("/leer-todas", async (req, res, next) => {
  try {
    const [r] = await pool.query(
      "UPDATE notificaciones SET leida = TRUE WHERE id_usuario = ? AND leida = FALSE",
      [req.usuario.id]
    );
    return res.json({ leidas: r.affectedRows });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA PATCH LEER TODAS ============

// ============ AQUÍ EMPIEZA RUTA PATCH LEER UNA ============
// PATCH /api/notificaciones/:id/leida — marca una mía como leída.
router.patch("/:id/leida", async (req, res, next) => {
  try {
    const [r] = await pool.query(
      "UPDATE notificaciones SET leida = TRUE WHERE id_notificacion = ? AND id_usuario = ?",
      [Number(req.params.id), req.usuario.id]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ detail: "Notificación inexistente" });
    }
    return res.json({ id: Number(req.params.id), leida: true });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA PATCH LEER UNA ============

// ============ AQUÍ EMPIEZA EXPORTS ============
module.exports = router;
// ============ AQUÍ TERMINA EXPORTS ============

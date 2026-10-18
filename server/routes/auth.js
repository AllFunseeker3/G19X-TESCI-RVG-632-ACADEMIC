// ============================================================================
// ARCHIVO: server/routes/auth.js
// FUNCIÓN GENERAL: login con correo+contraseña; devuelve JWT y datos básicos.
//   Cambio de contraseña del usuario logueado (CC-01, obligatorio en primer ingreso).
// FLUJO DE DATOS:
//   - ENTRAN: POST /api/auth/login { correo, contrasena } y
//     POST /api/auth/cambiar-contrasena { actual, nueva } + tabla usuarios/roles.
//   - SALEN: { token, usuario } hacia el front (guarda token para Bearer).
// QUÉ MODIFICAR SI hay cambios: ajustar payload del token en server/auth.js;
//   agregar registro/logout aquí.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const express = require("express");
const pool = require("../db");
const { hashContrasena, verificar, crearToken } = require("../auth");
const { conAuthPermitirCambio } = require("../middleware");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA ROUTER ============
const router = express.Router();
// ============ AQUÍ TERMINA ROUTER ============

// ============ AQUÍ EMPIEZA RUTA POST LOGIN ============
// POST /api/auth/login — valida credenciales y emite token (8h por defecto).
router.post("/login", async (req, res, next) => {
  try {
    const { correo, contrasena } = req.body || {};
    const [filas] = await pool.query(
      `SELECT u.id_usuario AS id, u.nombre, u.correo, u.hash_contrasena,
              u.debe_cambiar_contrasena, u.id_rol, u.id_area, u.activo, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.correo = ?`,
      [String(correo || "").trim()] // Normaliza correo antes de buscar.
    );
    const u = filas[0];
    if (!u || !u.activo || !verificar(contrasena, u.hash_contrasena)) {
      return res.status(401).json({ detail: "Credenciales inválidas" }); // No revela qué falló.
    }
    return res.json({
      token: crearToken(u.id),
      usuario: {
        id: u.id,
        nombre: u.nombre,
        correo: u.correo,
        rol: u.rol,
        id_rol: u.id_rol,
        id_area: u.id_area,
        debe_cambiar_contrasena: Boolean(u.debe_cambiar_contrasena), // CC-01: cambio obligatorio.
      },
    });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA POST LOGIN ============

// ============ AQUÍ EMPIEZA RUTA POST CAMBIAR CONTRASEÑA ============
// POST /api/auth/cambiar-contrasena — el usuario autenticado cambia su propia
// contraseña (CC-01: obligatorio en el primer ingreso). { actual, nueva }.
// conAuthPermitirCambio: única ruta que pasa con el flag activo.
router.post("/cambiar-contrasena", conAuthPermitirCambio, async (req, res, next) => {
  try {
    const { actual, nueva } = req.body || {};
    if (!actual || !nueva) {
      return res.status(400).json({ detail: "Indica la contraseña actual y la nueva" });
    }
    if (String(nueva).length < 8) {
      return res.status(400).json({ detail: "La contraseña nueva mínima es 8 caracteres" });
    }
    if (String(nueva) === String(actual)) {
      return res.status(400).json({ detail: "La contraseña nueva debe ser diferente a la actual" });
    }
    const [filas] = await pool.query(
      "SELECT hash_contrasena FROM usuarios WHERE id_usuario = ?",
      [req.usuario.id]
    );
    if (!filas[0] || !verificar(actual, filas[0].hash_contrasena)) {
      return res.status(401).json({ detail: "Contraseña actual incorrecta" });
    }
    await pool.query(
      "UPDATE usuarios SET hash_contrasena = ?, debe_cambiar_contrasena = FALSE WHERE id_usuario = ?",
      [hashContrasena(nueva), req.usuario.id]
    );
    return res.json({ ok: true });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA POST CAMBIAR CONTRASEÑA ============

// ============ AQUÍ EMPIEZA EXPORTS ============
module.exports = router;
// ============ AQUÍ TERMINA EXPORTS ============

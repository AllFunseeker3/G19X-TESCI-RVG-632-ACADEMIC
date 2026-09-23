// ============================================================================
// ARCHIVO: server/routes/auth.js
// FUNCIÓN GENERAL: login con correo+contraseña; devuelve JWT y datos básicos.
//   Solo ruta pública de autenticación del sistema.
// FLUJO DE DATOS:
//   - ENTRAN: POST /api/auth/login { correo, contrasena } + tabla usuarios/roles.
//   - SALEN: { token, usuario } hacia el front (guarda token para Bearer).
// QUÉ MODIFICAR SI hay cambios: ajustar payload del token en server/auth.js;
//   agregar registro/logout aquí.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const express = require("express");
const pool = require("../db");
const { verificar, crearToken } = require("../auth");
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
              u.id_rol, u.id_area, u.activo, r.nombre AS rol
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
      },
    });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA POST LOGIN ============

// ============ AQUÍ EMPIEZA EXPORTS ============
module.exports = router;
// ============ AQUÍ TERMINA EXPORTS ============

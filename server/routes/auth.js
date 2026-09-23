// ============================================================================
// RUTA: POST /api/auth/login — login con correo+contraseña, devuelve JWT.
// TABLAS: usuarios (verifica hash bcrypt y activo).
// ============================================================================
const express = require("express");
const pool = require("../db");
const { verificar, crearToken } = require("../auth");

const router = express.Router();

// POST /api/auth/login — valida credenciales y emite token (8h por defecto).
router.post("/login", async (req, res, next) => {
  try {
    const { correo, contrasena } = req.body || {};
    const [filas] = await pool.query(
      `SELECT u.id_usuario AS id, u.nombre, u.correo, u.hash_contrasena,
              u.id_rol, u.id_area, u.activo, r.nombre AS rol
       FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.correo = ?`,
      [String(correo || "").trim()]
    );
    const u = filas[0];
    if (!u || !u.activo || !verificar(contrasena, u.hash_contrasena)) {
      return res.status(401).json({ detail: "Credenciales inválidas" });
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

module.exports = router;

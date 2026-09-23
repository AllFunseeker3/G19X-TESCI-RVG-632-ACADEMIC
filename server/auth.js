// ============================================================================
// ARCHIVO: server/auth.js
// FUNCIÓN GENERAL: contraseñas (bcryptjs) y tokens JWT (jsonwebtoken, HS256).
// FLUJO DE DATOS:
//   - ENTRAN: JWT_SECRET/JWT_HORAS de server/.env.
//   - SALEN: routes/auth.js (emitir al login) y middleware.js (validar).
// REGLA: jamás comparar ni guardar contraseñas en claro.
// ============================================================================
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRETO = process.env.JWT_SECRET || "CAMBIA_ESTE_SECRETO";
const HORAS = Number(process.env.JWT_HORAS || 8);

// QUÉ HACE: hash bcrypt de una contraseña en claro (alta de usuarios).
function hashContrasena(claro) {
  return bcrypt.hashSync(String(claro), 10);
}

// QUÉ HACE: verifica contraseña en claro contra el hash guardado.
function verificar(claro, hashGuardado) {
  try {
    return bcrypt.compareSync(String(claro), String(hashGuardado));
  } catch {
    return false;
  }
}

// QUÉ HACE: emite JWT con sub=id_usuario y expiración en horas.
function crearToken(idUsuario) {
  return jwt.sign({ sub: idUsuario }, SECRETO, { expiresIn: `${HORAS}h` });
}

// QUÉ HACE: decodifica y valida el JWT. Lanza si es inválido/expiró.
function leerToken(token) {
  return jwt.verify(token, SECRETO);
}

module.exports = { hashContrasena, verificar, crearToken, leerToken };

// ============================================================================
// ARCHIVO: server/auth.js
// FUNCIÓN GENERAL: contraseñas (bcryptjs) y tokens JWT (jsonwebtoken, HS256).
//   Hashea, verifica y emite/valida tokens de sesión.
// FLUJO DE DATOS:
//   - ENTRAN: JWT_SECRET/JWT_HORAS de server/.env + credenciales del login.
//   - SALEN: routes/auth.js (emitir al login) y middleware.js (validar).
// QUÉ MODIFICAR SI hay cambios: rotar JWT_SECRET; ajustar expiración en
//   JWT_HORAS; subir cost factor de bcrypt si se requiere.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA CONSTANTES ============
const SECRETO = process.env.JWT_SECRET || "CAMBIA_ESTE_SECRETO";
const HORAS = Number(process.env.JWT_HORAS || 8);
// ============ AQUÍ TERMINA CONSTANTES ============

// ============ AQUÍ EMPIEZA FUNCIÓN HASHCONTRASEÑA ============
// QUÉ HACE: hash bcrypt de una contraseña en claro (alta de usuarios).
function hashContrasena(claro) {
  return bcrypt.hashSync(String(claro), 10); // Cost 10: equilibrio actual.
}
// ============ AQUÍ TERMINA FUNCIÓN HASHCONTRASEÑA ============

// ============ AQUÍ EMPIEZA FUNCIÓN VERIFICAR ============
// QUÉ HACE: verifica contraseña en claro contra el hash guardado.
function verificar(claro, hashGuardado) {
  try {
    return bcrypt.compareSync(String(claro), String(hashGuardado));
  } catch {
    return false; // Hash corrupto -> deniega sin romper.
  }
}
// ============ AQUÍ TERMINA FUNCIÓN VERIFICAR ============

// ============ AQUÍ EMPIEZA FUNCIÓN CREARTOKEN ============
// QUÉ HACE: emite JWT con sub=id_usuario y expiración en horas.
function crearToken(idUsuario) {
  return jwt.sign({ sub: idUsuario }, SECRETO, { expiresIn: `${HORAS}h` });
}
// ============ AQUÍ TERMINA FUNCIÓN CREARTOKEN ============

// ============ AQUÍ EMPIEZA FUNCIÓN LEERTOKEN ============
// QUÉ HACE: decodifica y valida el JWT. Lanza si es inválido/expiró.
function leerToken(token) {
  return jwt.verify(token, SECRETO);
}
// ============ AQUÍ TERMINA FUNCIÓN LEERTOKEN ============

// ============ AQUÍ EMPIEZA EXPORTS ============
module.exports = { hashContrasena, verificar, crearToken, leerToken };
// ============ AQUÍ TERMINA EXPORTS ============

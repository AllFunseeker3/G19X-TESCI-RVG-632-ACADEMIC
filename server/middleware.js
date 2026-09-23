// ============================================================================
// ARCHIVO: server/middleware.js
// FUNCIÓN GENERAL: autenticación y permisos por request.
//   conAuth valida Bearer JWT; exigir(categoria, accion) valida permiso.
// FLUJO DE DATOS:
//   - ENTRAN: header Authorization + tablas usuarios, roles, permisos_rol.
//   - SALEN: req.usuario (id, rol, área, admin) hacia routes/*.js.
// QUÉ MODIFICAR SI hay cambios: agregar acciones en COLUMNAS; cambiar query
//   de cargarUsuario si evoluciona el esquema de roles.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const pool = require("./db");
const { leerToken } = require("./auth");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA CONSTANTES ============
const COLUMNAS = {
  ver: "puede_ver",
  crear: "puede_crear",
  modificar: "puede_modificar",
  eliminar: "puede_eliminar",
  gestionar: "puede_gestionar_usuarios",
};
// ============ AQUÍ TERMINA CONSTANTES ============

// ============ AQUÍ EMPIEZA FUNCIÓN CARGARUSUARIO ============
// QUÉ HACE: valida el token y devuelve el usuario (o null si falla/inactivo).
async function cargarUsuario(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null; // Extrae token tras "Bearer ".
  if (!token) return null;
  let datos;
  try {
    datos = leerToken(token);
  } catch {
    return null; // Token inválido/expirado.
  }
  const [filas] = await pool.query(
    `SELECT u.id_usuario AS id, u.nombre, u.correo, u.id_rol, u.id_area,
            u.activo, r.nombre AS rol, r.es_super,
            (r.nombre = 'Administrador') AS admin
     FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = ?`,
    [datos.sub]
  );
  const u = filas[0];
  if (!u || !u.activo) return null;
  return { ...u, admin: u.admin === 1 }; // Normaliza flag admin a booleano.
}
// ============ AQUÍ TERMINA FUNCIÓN CARGARUSUARIO ============

// ============ AQUÍ EMPIEZA FUNCIÓN CONAUTH ============
// QUÉ HACE: middleware solo-auth (401 si no hay usuario válido).
async function conAuth(req, res, next) {
  const u = await cargarUsuario(req);
  if (!u) return res.status(401).json({ detail: "No autenticado" });
  req.usuario = u;
  return next();
}
// ============ AQUÍ TERMINA FUNCIÓN CONAUTH ============

// ============ AQUÍ EMPIEZA FUNCIÓN TIENEPERMISO ============
// QUÉ HACE: ¿tiene este rol este permiso en esta categoría? Admin = siempre sí.
async function tienePermiso(idRol, esAdmin, categoria, accion) {
  if (esAdmin) return true;
  const col = COLUMNAS[accion];
  if (!col) return false; // Acción desconocida -> deniega.
  const [filas] = await pool.query(
    `SELECT ${col} AS ok FROM permisos_rol WHERE id_rol = ? AND id_categoria = ?`,
    [idRol, categoria]
  );
  return Boolean(filas[0] && filas[0].ok);
}
// ============ AQUÍ TERMINA FUNCIÓN TIENEPERMISO ============

// ============ AQUÍ EMPIEZA FUNCIÓN EXIGIR ============
// QUÉ HACE: fábrica de middleware. Uso: exigir('oficios', 'crear').
function exigir(categoria, accion) {
  return async (req, res, next) => {
    const u = await cargarUsuario(req);
    if (!u) return res.status(401).json({ detail: "No autenticado" });
    if (!(await tienePermiso(u.id_rol, u.admin, categoria, accion))) {
      return res
        .status(403)
        .json({ detail: `Se requiere permiso '${accion}' en '${categoria}'` });
    }
    req.usuario = u;
    return next();
  };
}
// ============ AQUÍ TERMINA FUNCIÓN EXIGIR ============

// ============ AQUÍ EMPIEZA EXPORTS ============
module.exports = { conAuth, tienePermiso, exigir };
// ============ AQUÍ TERMINA EXPORTS ============

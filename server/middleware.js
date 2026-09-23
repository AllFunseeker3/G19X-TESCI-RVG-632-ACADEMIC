// ============================================================================
// ARCHIVO: server/middleware.js
// FUNCIÓN GENERAL: autenticación y permisos por request.
//   - conAuth: valida Bearer JWT y carga usuario (rol/área) en req.usuario.
//   - exigir(categoria, accion): además exige permiso en permisos_rol.
//     accion: 'ver'|'crear'|'modificar'|'eliminar'|'gestionar'.
//     El admin pasa todo; el resto se valida contra la BD.
// REGLA DE ÁREAS: el alcance por área se aplica en cada ruta filtrando por
//   id_area; aquí solo se valida el permiso.
// ============================================================================
const pool = require("./db");
const { leerToken } = require("./auth");

const COLUMNAS = {
  ver: "puede_ver",
  crear: "puede_crear",
  modificar: "puede_modificar",
  eliminar: "puede_eliminar",
  gestionar: "puede_gestionar_usuarios",
};

// QUÉ HACE: valida el token y devuelve el usuario (o null si falla/inactivo).
async function cargarUsuario(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  let datos;
  try {
    datos = leerToken(token);
  } catch {
    return null;
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
  return { ...u, admin: u.admin === 1 };
}

// QUÉ HACE: middleware solo-auth (401 si no hay usuario válido).
async function conAuth(req, res, next) {
  const u = await cargarUsuario(req);
  if (!u) return res.status(401).json({ detail: "No autenticado" });
  req.usuario = u;
  return next();
}

// QUÉ HACE: ¿tiene este rol este permiso en esta categoría? Admin = siempre sí.
async function tienePermiso(idRol, esAdmin, categoria, accion) {
  if (esAdmin) return true;
  const col = COLUMNAS[accion];
  if (!col) return false;
  const [filas] = await pool.query(
    `SELECT ${col} AS ok FROM permisos_rol WHERE id_rol = ? AND id_categoria = ?`,
    [idRol, categoria]
  );
  return Boolean(filas[0] && filas[0].ok);
}

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

module.exports = { conAuth, tienePermiso, exigir };

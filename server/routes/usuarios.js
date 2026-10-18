// ============================================================================
// ARCHIVO: server/routes/usuarios.js
// FUNCIÓN GENERAL: gestión de usuarios (alta, detalle, edición, baja lógica)
//   y matriz de permisos propia; catálogos de roles/áreas/puestos.
// FLUJO DE DATOS:
//   - ENTRAN: requests autenticados + tablas usuarios, roles, permisos_rol, areas.
//   - SALEN: JSON de usuarios/permisos hacia la vista Usuarios del front.
// QUÉ MODIFICAR SI hay cambios: ajustar reglas de alcance en validarCreacion
//   y puedeGestionar; agregar campos editables en PATCH /:id.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const express = require("express");
const { randomInt } = require("crypto");
const pool = require("../db");
const { hashContrasena } = require("../auth");
const { conAuth } = require("../middleware");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA ROUTER Y AUTH ============
const router = express.Router();
router.use(conAuth); // Todas exigen login.
// ============ AQUÍ TERMINA ROUTER Y AUTH ============

// ============ AQUÍ EMPIEZA HELPERS ============

// QUÉ HACE: ¿puede `u` gestionar usuarios? Admin sí; si tiene
// puede_gestionar_usuarios en alguna categoría, solo dentro de su área.
async function puedeGestionar(u) {
  if (u.admin) return true;
  const [filas] = await pool.query(
    "SELECT 1 FROM permisos_rol WHERE id_rol = ? AND puede_gestionar_usuarios = TRUE LIMIT 1",
    [u.id_rol]
  );
  return filas.length > 0;
}

// QUÉ HACE: genera correo automático: 3 letras nombre + 3 paterno + 3 materno + @sislegal.mx
// Sin acentos (los correos van en ASCII): Méndez -> men.
function generarCorreo(nombreCompleto) {
  const sinAcentos = String(nombreCompleto || "")
    .normalize("NFD") // Descompone acentos para quitarlos.
    .replace(/[\u0300-\u036f]/g, "");
  const partes = sinAcentos.trim().split(/\s+/);
  if (partes.length < 2) return null; // Requiere al menos nombre + paterno.
  const nombre = partes[0].substring(0, 3).toLowerCase();
  const paterno = partes[1].substring(0, 3).toLowerCase();
  const materno = partes.length > 2 ? partes[2].substring(0, 3).toLowerCase() : "xxx";
  return `${nombre}${paterno}${materno}@sislegal.mx`;
}

// QUÉ HACE: contraseña temporal por usuario: la parte del correo antes de "@"
// + 4 caracteres aleatorios legibles (sin 0/O/1/l/I). Se muestra una sola vez
// al crear (CC-01) y el usuario DEBE cambiarla en su primer ingreso.
function generarContrasenaTemporal(correo) {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let sufijo = "";
  for (let i = 0; i < 4; i++) sufijo += letras[randomInt(0, letras.length)];
  const base = String(correo || "").split("@")[0] || "usuario";
  return base + sufijo;
}

// QUÉ HACE: ¿puede el usuario actual crear un usuario con este rol/área?
async function validarCreacion(u, idRol, id_area = null) {
  const [roles] = await pool.query(
    "SELECT id_rol, id_area FROM roles WHERE id_rol = ?",
    [idRol]
  );
  const rol = roles[0];
  if (!rol) return { ok: false, msg: "Rol inexistente" };
  // Admin: puede crear cualquier rol en cualquier área.
  // Si el rol no tiene área propia (ej. Administrador), el área es obligatoria.
  if (u.admin) {
    const area = id_area || rol.id_area || null;
    if (!area) return { ok: false, msg: "Indica el área para este rol" };
    return { ok: true, area };
  }
  // Superusuarios: solo roles de SU área, NO pueden crear superusuarios (rol con puede_gestionar_usuarios=1)
  const [rolPermisos] = await pool.query(
    "SELECT puede_gestionar_usuarios FROM roles WHERE id_rol = ?",
    [idRol]
  );
  if (rolPermisos[0]?.puede_gestionar_usuarios) {
    return { ok: false, msg: "No puedes crear superusuarios" };
  }
  if (rol.id_area !== u.id_area) {
    return { ok: false, msg: "Solo roles de tu área" };
  }
  return { ok: true, area: u.id_area }; // Forza su propia área.
}

// ============ AQUÍ TERMINA HELPERS ============

// ============ AQUÍ EMPIEZA RUTA GET MIS PERMISOS ============
// GET /api/usuarios/yo/permisos — matriz del usuario (la UI filtra con esto).
router.get("/yo/permisos", async (req, res) => {
  const u = req.usuario;
  const [filas] = await pool.query(
    `SELECT id_categoria AS categoria, puede_ver, puede_crear,
            puede_modificar, puede_eliminar,
            puede_gestionar_usuarios AS puede_gestionar
     FROM permisos_rol WHERE id_rol = ?`,
    [u.id_rol]
  );
  for (const f of filas) {
    for (const k of [
      "puede_ver",
      "puede_crear",
      "puede_modificar",
      "puede_eliminar",
      "puede_gestionar",
    ]) {
      f[k] = f[k] === 1; // Normaliza TINYINT a booleano.
    }
  }
  return res.json({ admin: u.admin, es_super: Boolean(u.es_super), id_area: u.id_area, permisos: filas });
});
// ============ AQUÍ TERMINA RUTA GET MIS PERMISOS ============

// ============ AQUÍ EMPIEZA RUTA GET LISTA USUARIOS ============
// GET /api/usuarios — admin: todos; super: solo los de su área.
router.get("/", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!(await puedeGestionar(u)))
      return res.status(403).json({ detail: "Sin permiso de gestión" });
    let q = `SELECT u.id_usuario AS id, u.nombre, u.correo, u.id_rol, r.nombre AS rol,
                  u.id_area, a.nombre AS area, u.puesto, u.telefono,
                  u.fecha_ingreso, u.activo
           FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
           JOIN areas a ON a.id_area = u.id_area`;
    const args = [];
    if (!u.admin) {
      q += " WHERE u.id_area = ?";
      args.push(u.id_area);
    }
    q += " ORDER BY u.id_usuario";
    const [filas] = await pool.query(q, args);
    return res.json(filas);
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET LISTA USUARIOS ============

// ============ AQUÍ EMPIEZA RUTA GET ROLES ============
// GET /api/roles — roles asignables según alcance (admin: todos).
router.get("/roles", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!(await puedeGestionar(u)))
      return res.status(403).json({ detail: "Sin permiso de gestión" });
    let q = `SELECT r.id_rol AS id, r.nombre, r.id_area, a.nombre AS area,
                    r.puede_gestionar_usuarios AS es_gestor
             FROM roles r LEFT JOIN areas a ON a.id_area = r.id_area
             WHERE r.activo = TRUE`;
    const args = [];
    if (!u.admin) {
      // Solo roles de SU área (el rol Administrador, sin área, no aparece).
      q += " AND r.id_area = ?";
      args.push(u.id_area);
    }
    q += " ORDER BY r.id_rol";
    const [filas] = await pool.query(q, args);
    return res.json(filas);
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET ROLES ============

// ============ AQUÍ EMPIEZA RUTA GET ÁREAS ============
// GET /api/areas — áreas asignables según alcance (admin: todas).
router.get("/areas", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!(await puedeGestionar(u)))
      return res.status(403).json({ detail: "Sin permiso de gestión" });
    let q = "SELECT id_area AS id, nombre FROM areas WHERE activa = TRUE";
    const args = [];
    if (!u.admin) {
      q += " AND id_area = ?";
      args.push(u.id_area); // Super: solo su área.
    }
    const [filas] = await pool.query(q, args);
    return res.json(filas);
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET ÁREAS ============

// ============ AQUÍ EMPIEZA RUTA GET PUESTOS ============
// GET /api/puestos — catálogo para el select de Usuarios (cualquiera que gestiona).
router.get("/puestos", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!(await puedeGestionar(u)))
      return res.status(403).json({ detail: "Sin permiso de gestión" });
    const [filas] = await pool.query(
      "SELECT id_puesto AS id, nombre FROM puestos WHERE activo = TRUE ORDER BY nombre"
    );
    return res.json(filas);
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET PUESTOS ============

// ============ AQUÍ EMPIEZA RUTA GET DETALLE USUARIO ============
// GET /api/usuarios/:id — detalle de un usuario con sus permisos.
router.get("/:id", async (req, res, next) => {
  try {
    const u = req.usuario;
    const [filas] = await pool.query(
      `SELECT u.id_usuario AS id, u.nombre, u.correo, u.id_rol, r.nombre AS rol,
              u.id_area, a.nombre AS area, u.puesto, u.telefono,
              u.fecha_ingreso, u.activo, u.creado_en
       FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
       JOIN areas a ON a.id_area = u.id_area
       WHERE u.id_usuario = ?`,
      [req.params.id]
    );
    const d = filas[0];
    if (!d) return res.status(404).json({ detail: "Usuario no encontrado" });
    if (!u.admin && d.id_area !== u.id_area) {
      return res.status(403).json({ detail: "Sin acceso a este usuario" });
    }
    const [permisos] = await pool.query(
      `SELECT id_categoria AS categoria, puede_ver, puede_crear,
              puede_modificar, puede_eliminar,
              puede_gestionar_usuarios AS puede_gestionar
       FROM permisos_rol WHERE id_rol = ?`,
      [d.id_rol]
    );
    for (const f of permisos) {
      for (const k of [
        "puede_ver",
        "puede_crear",
        "puede_modificar",
        "puede_eliminar",
        "puede_gestionar",
      ]) {
        f[k] = f[k] === 1;
      }
    }
    d.permisos = permisos;
    return res.json(d);
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET DETALLE USUARIO ============

// ============ AQUÍ EMPIEZA RUTA POST CREAR USUARIO ============
// POST /api/usuarios — alta con email auto y contraseña temporal (CC-01).
router.post("/", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!(await puedeGestionar(u)))
      return res.status(403).json({ detail: "Sin permiso de gestión" });
    const {
      nombre,
      correo = null,
      contrasena = null,
      id_rol,
      id_area = null,
      puesto = null,
      telefono = null,
      fecha_ingreso = null,
    } = req.body || {};
    if (!String(nombre || "").trim()) {
      return res.status(400).json({ detail: "El nombre es obligatorio" });
    }
    const validacion = await validarCreacion(u, id_rol, id_area);
    if (!validacion.ok) return res.status(403).json({ detail: validacion.msg });
    const area = validacion.area;
    let email = correo;
    if (!email) {
      email = generarCorreo(nombre);
      if (!email) return res.status(400).json({ detail: "Nombre inválido para generar correo" });
      // Asegurar unicidad
      let contador = 1;
      let emailFinal = email;
      while (true) {
        const [existe] = await pool.query("SELECT 1 FROM usuarios WHERE correo = ?", [emailFinal]);
        if (!existe.length) break;
        emailFinal = email.replace("@sislegal.mx", "") + contador + "@sislegal.mx"; // Sufijo numérico.
        contador++;
      }
      email = emailFinal;
    }
    // Contraseña temporal por usuario (correo + 4 aleatorios, CC-01); si el
    // admin mandó una manual, se respeta. En ambos casos el primer ingreso
    // obliga a cambiarla (debe_cambiar_contrasena = TRUE).
    const pass = contrasena || generarContrasenaTemporal(email);
    if (String(pass).length < 8) {
      return res.status(400).json({ detail: "La contraseña mínima es 8 caracteres" });
    }
    const [r] = await pool.query(
      `INSERT INTO usuarios
       (nombre, correo, hash_contrasena, debe_cambiar_contrasena, id_rol, id_area,
        puesto, telefono, fecha_ingreso)
       VALUES (?, ?, ?, TRUE, ?, ?, ?, ?, ?)`,
      [
        String(nombre || "").trim(),
        email,
        hashContrasena(pass), // Guarda hash, nunca claro.
        id_rol,
        area,
        puesto,
        telefono,
        fecha_ingreso || null,
      ]
    );
    return res.status(201).json({ id: r.insertId, correo: email, contrasena: pass }); // Temporal: se muestra una sola vez.
  } catch (e) {
    if (e && e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ detail: "Correo ya registrado" });
    }
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA POST CREAR USUARIO ============

// ============ AQUÍ EMPIEZA RUTA PATCH ACTUALIZAR USUARIO ============
// PATCH /api/usuarios/:id — actualizar usuario (permisos, activo, datos).
router.patch("/:id", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!(await puedeGestionar(u)))
      return res.status(403).json({ detail: "Sin permiso de gestión" });
    const targetId = Number(req.params.id);
    const [filas] = await pool.query(
      "SELECT id_usuario, id_rol, id_area, activo FROM usuarios WHERE id_usuario = ?",
      [targetId]
    );
    const target = filas[0];
    if (!target) return res.status(404).json({ detail: "Usuario no encontrado" });
    if (!u.admin && target.id_area !== u.id_area) {
      return res.status(403).json({ detail: "Sin acceso a este usuario" });
    }
    const { id_rol, activo, puesto, telefono, fecha_ingreso } = req.body || {};
    if (id_rol !== undefined && id_rol !== target.id_rol) {
      const [roles] = await pool.query(
        "SELECT id_rol, id_area, puede_gestionar_usuarios FROM roles WHERE id_rol = ?",
        [id_rol]
      );
      const nuevoRol = roles[0];
      if (!nuevoRol) return res.status(400).json({ detail: "Rol inexistente" });
      if (!u.admin) {
        if (nuevoRol.id_area !== u.id_area) {
          return res.status(403).json({ detail: "Solo roles de tu área" });
        }
        if (nuevoRol.puede_gestionar_usuarios) {
          return res.status(403).json({ detail: "No puedes asignar rol superusuario" });
        }
      }
    }
    if (activo === 0 && targetId === u.id) {
      return res.status(400).json({ detail: "No puedes desactivarte a ti mismo" });
    }
    if (id_rol !== undefined && id_rol !== target.id_rol && targetId === u.id) {
      return res.status(400).json({ detail: "No puedes cambiar tu propio rol" });
    }
    const campos = [];
    const valores = [];
    if (id_rol !== undefined) { campos.push("id_rol = ?"); valores.push(id_rol); }
    if (activo !== undefined) { campos.push("activo = ?"); valores.push(activo); }
    if (puesto !== undefined) { campos.push("puesto = ?"); valores.push(puesto); }
    if (telefono !== undefined) { campos.push("telefono = ?"); valores.push(telefono); }
    if (fecha_ingreso !== undefined) { campos.push("fecha_ingreso = ?"); valores.push(fecha_ingreso); }
    if (campos.length === 0) return res.status(400).json({ detail: "Nada que actualizar" });
    valores.push(targetId);
    await pool.query(
      `UPDATE usuarios SET ${campos.join(", ")} WHERE id_usuario = ?`,
      valores
    );
    return res.json({ ok: true });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA PATCH ACTUALIZAR USUARIO ============

// ============ AQUÍ EMPIEZA RUTA PATCH PERMISOS DEL ROL ============
// PATCH /api/usuarios/roles/:id/permisos — prende/apaga un permiso del ROL.
// BODY: { categoria: 'cartas'|'oficios'|'avisos'|'notificaciones',
//         accion: 'ver'|'crear'|'modificar'|'eliminar'|'gestionar',
//         valor: true|false }.
// OJO: cambia el rol completo (afecta a TODOS los usuarios con ese rol).
// Solo quien gestiona; no-admin solo roles normales de SU área.
const MAPA_COLUMNAS_PERMISO = {
  ver: "puede_ver",
  crear: "puede_crear",
  modificar: "puede_modificar",
  eliminar: "puede_eliminar",
  gestionar: "puede_gestionar_usuarios",
};
router.patch("/roles/:id/permisos", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!(await puedeGestionar(u)))
      return res.status(403).json({ detail: "Sin permiso de gestión" });
    const idRol = Number(req.params.id);
    const { categoria, accion, valor } = req.body || {};
    const columna = MAPA_COLUMNAS_PERMISO[accion];
    if (!columna || typeof categoria !== "string" || typeof valor !== "boolean")
      return res.status(400).json({ detail: "Datos inválidos (categoria, accion, valor)" });
    const [roles] = await pool.query(
      "SELECT id_rol, id_area, puede_gestionar_usuarios AS es_gestor FROM roles WHERE id_rol = ?",
      [idRol]
    );
    const rol = roles[0];
    if (!rol) return res.status(404).json({ detail: "Rol inexistente" });
    if (!u.admin) {
      if (rol.id_area !== u.id_area)
        return res.status(403).json({ detail: "Solo roles de tu área" });
      if (rol.es_gestor)
        return res.status(403).json({ detail: "Solo el admin edita roles superusuarios" });
    }
    const [cats] = await pool.query(
      "SELECT id_categoria FROM categorias WHERE id_categoria = ?",
      [categoria]
    );
    if (!cats[0]) return res.status(400).json({ detail: "Categoría inexistente" });
    await pool.query(
      `UPDATE permisos_rol SET ${columna} = ? WHERE id_rol = ? AND id_categoria = ?`, // Columna de lista blanca.
      [valor ? 1 : 0, idRol, categoria]
    );
    return res.json({ ok: true, id_rol: idRol, categoria, accion, valor });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA PATCH PERMISOS DEL ROL ============

// ============ AQUÍ EMPIEZA RUTA DELETE BAJA LÓGICA ============
// DELETE /api/usuarios/:id — baja lógica (activo = 0). No borra de la BD.
router.delete("/:id", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!(await puedeGestionar(u)))
      return res.status(403).json({ detail: "Sin permiso de gestión" });
    const targetId = Number(req.params.id);
    if (targetId === u.id) {
      return res.status(400).json({ detail: "No puedes darte de baja a ti mismo" });
    }
    const [filas] = await pool.query(
      "SELECT id_usuario, id_area FROM usuarios WHERE id_usuario = ?",
      [targetId]
    );
    const target = filas[0];
    if (!target) return res.status(404).json({ detail: "Usuario no encontrado" });
    if (!u.admin && target.id_area !== u.id_area) {
      return res.status(403).json({ detail: "Sin acceso a este usuario" });
    }
    await pool.query("UPDATE usuarios SET activo = 0 WHERE id_usuario = ?", [targetId]);
    return res.json({ ok: true, mensaje: "Usuario dado de baja (activo = 0)" });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA DELETE BAJA LÓGICA ============

// ============ AQUÍ EMPIEZA EXPORTS ============
module.exports = router;
// ============ AQUÍ TERMINA EXPORTS ============

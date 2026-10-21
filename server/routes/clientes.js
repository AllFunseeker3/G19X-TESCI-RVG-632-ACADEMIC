// ============================================================================
// ARCHIVO: server/routes/clientes.js
// FUNCIÓN GENERAL: directorio de clientes (personas/empresas) con verificación.
//   Solo roles con permiso de cartas pueden ver/gestionar clientes (PII).
//   El alta de no-privilegiados queda pendiente hasta que un admin/super la verifique.
// FLUJO DE DATOS:
//   - ENTRAN: requests autenticados + tabla clientes.
//   - SALEN: JSON de lista/alta/edición hacia Pages/Clientes.jsx y el
//     autocomplete de GenerarCarta.jsx.
// QUÉ MODIFICAR SI hay cambios: endurecer reglas de lectura/escritura aquí
//   (el front solo oculta botones; el back decide).
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const express = require("express");
const pool = require("../db");
const { conAuth, tienePermiso } = require("../middleware");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA ROUTER ============
const router = express.Router();
router.use(conAuth); // Todas exigen login.
// ============ AQUÍ TERMINA ROUTER ============

// ============ AQUÍ EMPIEZA HELPERS PERMISOS ============
// QUÉ HACE: ¿puede `u` ver clientes (incluye RFC/CURP/domicilio)? Solo
// admin o roles con permiso de ver cartas; Operativo/Super Operativo no.
async function puedeVerClientes(u) {
  if (u.admin) return true;
  return tienePermiso(u.id_rol, false, "cartas", "ver");
}

// QUÉ HACE: ¿puede `u` escribir en el directorio? Admin o roles con permiso
// de crear/modificar cartas (los clientes se usan para redactar cartas).
async function puedeEscribir(u) {
  if (u.admin) return true;
  return (
    (await tienePermiso(u.id_rol, false, "cartas", "crear")) ||
    (await tienePermiso(u.id_rol, false, "cartas", "modificar"))
  );
}

// QUÉ HACE: ¿es privilegiado (su alta nace verificada)? Admin o super.
function esPrivilegiado(u) {
  return Boolean(u.admin || u.es_super);
}
// ============ AQUÍ TERMINA HELPERS PERMISOS ============

// ============ AQUÍ EMPIEZA RUTA GET LISTA ============
// GET /api/clientes?solo_pendientes=0 — activos (verificados primero).
router.get("/", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!(await puedeVerClientes(u))) {
      return res.status(403).json({ detail: "Sin permiso para consultar clientes" });
    }
    const solo = String(req.query.solo_pendientes ?? "0") === "1";
    if (solo && !esPrivilegiado(u)) {
      return res.status(403).json({ detail: "Solo admin o super ven pendientes" });
    }
    let q = `SELECT id_cliente AS id, tipo_cliente, nombre, rfc, curp,
                    domicilio, correo, telefono, verificado, creado_en
             FROM clientes WHERE activo = TRUE`;
    if (solo) q += " AND verificado = FALSE";
    q += " ORDER BY verificado DESC, nombre";
    const [filas] = await pool.query(q);
    return res.json(filas);
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET LISTA ============

// ============ AQUÍ EMPIEZA RUTA POST ALTA ============
// POST /api/clientes { tipo_cliente, nombre, rfc?, curp?, domicilio?, correo?, telefono? }.
// Alta de cualquiera con escritura; nace verificada solo si es admin/super.
router.post("/", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!(await puedeEscribir(u))) {
      return res.status(403).json({ detail: "Sin permiso para dar de alta clientes" });
    }
    const { tipo_cliente = "moral", nombre, rfc = null, curp = null,
      domicilio = null, correo = null, telefono = null } = req.body || {};
    if (!["fisica", "moral"].includes(tipo_cliente)) {
      return res.status(400).json({ detail: "Tipo inválido (fisica|moral)" });
    }
    if (!(nombre ?? "").toString().trim()) {
      return res.status(400).json({ detail: "El nombre es obligatorio" });
    }
    const verificado = esPrivilegiado(u);
    const [r] = await pool.query(
      `INSERT INTO clientes
       (tipo_cliente, nombre, rfc, curp, domicilio, correo, telefono, verificado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tipo_cliente, nombre.trim(), rfc || null, curp || null,
        domicilio || null, correo || null, telefono || null, verificado]
    );
    return res.status(201).json({ id: r.insertId, verificado });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA POST ALTA ============

// ============ AQUÍ EMPIEZA RUTA PATCH EDITAR ============
// PATCH /api/clientes/:id — edita datos. Si quien edita NO es privilegiado,
// el cliente vuelve a pendiente (verificado = FALSE).
router.patch("/:id", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!(await puedeEscribir(u))) {
      return res.status(403).json({ detail: "Sin permiso para editar clientes" });
    }
    const id = Number(req.params.id);
    const [[existe]] = await pool.query(
      "SELECT id_cliente FROM clientes WHERE id_cliente = ? AND activo = TRUE", [id]);
    if (!existe) return res.status(404).json({ detail: "Cliente inexistente" });
    const { tipo_cliente, nombre, rfc, curp, domicilio, correo, telefono } = req.body || {};
    const sets = [];
    const args = [];
    const pon = (col, v) => {
      if (v !== undefined) { sets.push(`${col} = ?`); args.push(v === "" ? null : v); }
    };
    if (tipo_cliente !== undefined && !["fisica", "moral"].includes(tipo_cliente)) {
      return res.status(400).json({ detail: "Tipo inválido (fisica|moral)" });
    }
    pon("tipo_cliente", tipo_cliente);
    if (nombre !== undefined && !String(nombre).trim()) {
      return res.status(400).json({ detail: "El nombre es obligatorio" });
    }
    if (nombre !== undefined) { sets.push("nombre = ?"); args.push(String(nombre).trim()); }
    pon("rfc", rfc); pon("curp", curp); pon("domicilio", domicilio);
    pon("correo", correo); pon("telefono", telefono);
    if (!esPrivilegiado(u)) { sets.push("verificado = FALSE"); } // Re-verificar tras toque ajeno.
    if (sets.length === 0) return res.json({ id });
    args.push(id);
    await pool.query(`UPDATE clientes SET ${sets.join(", ")} WHERE id_cliente = ?`, args);
    return res.json({ id });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA PATCH EDITAR ============

// ============ AQUÍ EMPIEZA RUTA PATCH VERIFICAR ============
// PATCH /api/clientes/:id/verificar { verificado } — solo admin/super.
router.patch("/:id/verificar", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!esPrivilegiado(u)) {
      return res.status(403).json({ detail: "Solo admin o super verifican clientes" });
    }
    const id = Number(req.params.id);
    const verificado = Boolean(req.body?.verificado ?? true);
    const [r] = await pool.query(
      "UPDATE clientes SET verificado = ? WHERE id_cliente = ? AND activo = TRUE",
      [verificado, id]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ detail: "Cliente inexistente" });
    }
    return res.json({ id, verificado });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA PATCH VERIFICAR ============

// ============ AQUÍ EMPIEZA RUTA DELETE BAJA ============
// DELETE /api/clientes/:id — baja lógica (activo = 0). Solo admin/super.
router.delete("/:id", async (req, res, next) => {
  try {
    const u = req.usuario;
    if (!esPrivilegiado(u)) {
      return res.status(403).json({ detail: "Solo admin o super dan de baja clientes" });
    }
    const [r] = await pool.query(
      "UPDATE clientes SET activo = FALSE WHERE id_cliente = ? AND activo = TRUE",
      [Number(req.params.id)]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ detail: "Cliente inexistente" });
    }
    return res.json({ id: Number(req.params.id), activo: false });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA DELETE BAJA ============

// ============ AQUÍ EMPIEZA EXPORTS ============
module.exports = router;
// ============ AQUÍ TERMINA EXPORTS ============

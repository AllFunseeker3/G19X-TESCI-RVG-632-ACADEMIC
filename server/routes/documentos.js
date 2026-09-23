// ============================================================================
// RUTAS: /api/documentos — CRUD de cartas/oficios/avisos/notificaciones.
// TABLAS: documentos, documento_historial, adjuntos (+tipos para categoría).
// ALCANCE POR ÁREA: no-admin solo ve/toca docs de SU id_area en categorías
//   con permiso. Admin ve todo y puede indicar id_area al crear.
// ============================================================================
const express = require("express");
const pool = require("../db");
const { conAuth, tienePermiso } = require("../middleware");

const router = express.Router();
router.use(conAuth);

const ESTADOS = new Set([
  "borrador",
  "por_revisar",
  "aprobado",
  "rechazado",
  "notificado",
]);

// QUÉ HACE: categoría del tipo (para checar permiso). 404 si no existe.
async function categoriaDe(idTipo) {
  const [filas] = await pool.query(
    "SELECT id_categoria FROM tipos_documento WHERE id_tipo = ?",
    [idTipo]
  );
  return filas[0] ? filas[0].id_categoria : null;
}

// QUÉ HACE: trae el doc + valida área y permiso (404/403 según aplique).
async function docVisible(idDoc, u, accion) {
  const [filas] = await pool.query(
    `SELECT d.*, t.id_categoria AS categoria, c.nombre AS cliente
     FROM documentos d JOIN tipos_documento t ON t.id_tipo = d.id_tipo
     LEFT JOIN clientes c ON c.id_cliente = d.id_cliente
     WHERE d.id_documento = ?`,
    [idDoc]
  );
  const d = filas[0];
  if (!d) {
    const e = new Error("Documento inexistente");
    e.status = 404;
    throw e;
  }
  if (
    !u.admin &&
    (d.id_area !== u.id_area ||
      !(await tienePermiso(u.id_rol, false, d.categoria, accion)))
  ) {
    const e = new Error("Sin acceso al documento");
    e.status = 403;
    throw e;
  }
  return d;
}

// GET /api/documentos?estado=&tipo= — lista (máx 500, recientes primero).
router.get("/", async (req, res, next) => {
  try {
    const u = req.usuario;
  let q = `SELECT d.id_documento AS id, d.folio, d.id_tipo, t.nombre AS tipo,
                  d.id_cliente, c.nombre AS cliente, d.estado, d.id_area,
                  d.creado_en, d.actualizado_en,
                  t.id_categoria AS categoria
           FROM documentos d JOIN tipos_documento t ON t.id_tipo = d.id_tipo
           LEFT JOIN clientes c ON c.id_cliente = d.id_cliente
           WHERE 1 = 1`;
  const args = [];
  if (!u.admin) {
    q += " AND d.id_area = ?";
    args.push(u.id_area);
  }
  if (req.query.estado) {
    q += " AND d.estado = ?";
    args.push(req.query.estado);
  }
  if (req.query.tipo) {
    q += " AND d.id_tipo = ?";
    args.push(req.query.tipo);
  }
  q += " ORDER BY d.id_documento DESC LIMIT 500";
  let [filas] = await pool.query(q, args);
  if (!u.admin) {
    const visibles = [];
    for (const f of filas) {
      if (await tienePermiso(u.id_rol, false, f.categoria, "ver"))
        visibles.push(f);
    }
    filas = visibles;
  }
  return res.json(filas);
  } catch (e) {
    return next(e);
  }
});

// POST /api/documentos — crea en 'borrador' + historial inicial.
router.post("/", async (req, res, next) => {
  try {
    const u = req.usuario;
  const { id_tipo, folio = null, id_cliente = null, id_area = null, datos = {} } = req.body || {};
  const cat = await categoriaDe(id_tipo);
  if (!cat) return res.status(404).json({ detail: "Tipo inexistente" });
  if (!(await tienePermiso(u.id_rol, u.admin, cat, "crear"))) {
    return res
      .status(403)
      .json({ detail: `Sin permiso de crear en '${cat}'` });
  }
  const area = u.admin && id_area ? id_area : u.id_area;
  const [r] = await pool.query(
    `INSERT INTO documentos
     (folio, id_tipo, id_cliente, id_creador, id_area, estado, datos)
     VALUES (?, ?, ?, ?, ?, 'borrador', ?)`,
    [folio, id_tipo, id_cliente, u.id, area, JSON.stringify(datos)]
  );
    await pool.query(
      `INSERT INTO documento_historial
       (id_documento, estado_anterior, estado_nuevo, id_responsable, comentario)
       VALUES (?, NULL, 'borrador', ?, 'Creación del documento')`,
      [r.insertId, u.id]
    );
    return res.status(201).json({ id: r.insertId, estado: "borrador" });
  } catch (e) {
    return next(e);
  }
});

// GET /api/documentos/actividad/reciente?limite=6 — últimas etapas de la
// trazabilidad (para Inicio). No-admin: solo su área. OJO: va ANTES de /:id
// para que Express no la confunda con un id.
router.get("/actividad/reciente", async (req, res, next) => {
  try {
    const u = req.usuario;
    const lim = Math.min(Number(req.query.limite) || 6, 50);
    let q = `SELECT h.id_historial AS n, d.id_documento AS docId, t.nombre AS tipo,
                    h.estado_nuevo AS etapa, h.creado_en AS fecha,
                    u.nombre AS responsable, h.comentario
             FROM documento_historial h
             JOIN documentos d ON d.id_documento = h.id_documento
             JOIN tipos_documento t ON t.id_tipo = d.id_tipo
             JOIN usuarios u ON u.id_usuario = h.id_responsable
             WHERE 1 = 1`;
    const args = [];
    if (!u.admin) {
      q += " AND d.id_area = ?";
      args.push(u.id_area);
    }
    q += " ORDER BY h.id_historial DESC LIMIT ?";
    args.push(lim);
    const [filas] = await pool.query(q, args);
    return res.json(filas);
  } catch (e) {
    return next(e);
  }
});

// GET /api/documentos/:id — detalle + datos JSON + historial + adjuntos.
router.get("/:id", async (req, res, next) => {
  try {
    const d = await docVisible(Number(req.params.id), req.usuario, "ver");
    const [hist] = await pool.query(
      `SELECT h.estado_anterior, h.estado_nuevo, h.id_responsable,
              u.nombre AS responsable, h.comentario, h.creado_en
       FROM documento_historial h JOIN usuarios u ON u.id_usuario = h.id_responsable
       WHERE h.id_documento = ? ORDER BY h.id_historial`,
      [d.id_documento]
    );
    const [adj] = await pool.query(
      `SELECT id_adjunto AS id, nombre_archivo, tipo_mime,
              tamano_bytes, ruta, subido_en FROM adjuntos
       WHERE id_documento = ? ORDER BY id_adjunto`,
      [d.id_documento]
    );
    d.datos = typeof d.datos === "string" ? JSON.parse(d.datos) : d.datos;
    d.historial = hist;
    d.adjuntos = adj;
    return res.json(d);
  } catch (e) {
    return next(e);
  }
});

// PATCH /api/documentos/:id/estado — cambia estado + deja rastro.
router.patch("/:id/estado", async (req, res, next) => {
  try {
    const { estado, comentario = null } = req.body || {};
    if (!ESTADOS.has(estado))
      return res.status(400).json({ detail: "Estado inválido" });
    const d = await docVisible(Number(req.params.id), req.usuario, "modificar");
    await pool.query("UPDATE documentos SET estado = ? WHERE id_documento = ?", [
      estado,
      d.id_documento,
    ]);
    await pool.query(
      `INSERT INTO documento_historial
       (id_documento, estado_anterior, estado_nuevo, id_responsable, comentario)
       VALUES (?, ?, ?, ?, ?)`,
      [d.id_documento, d.estado, estado, req.usuario.id, comentario]
    );
    return res.json({ id: d.id_documento, estado });
  } catch (e) {
    return next(e);
  }
});

// POST /api/documentos/:id/adjuntos — ficha de un PDF ya almacenado.
router.post("/:id/adjuntos", async (req, res, next) => {
  try {
    const { nombre_archivo, tipo_mime = "application/pdf", tamano_bytes = null, ruta } = req.body || {};
    const d = await docVisible(Number(req.params.id), req.usuario, "modificar");
    if (tipo_mime !== "application/pdf")
      return res.status(400).json({ detail: "Solo se aceptan PDF" });
    const [r] = await pool.query(
      `INSERT INTO adjuntos
       (id_documento, nombre_archivo, tipo_mime, tamano_bytes, ruta, id_subido_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [d.id_documento, nombre_archivo, tipo_mime, tamano_bytes, ruta, req.usuario.id]
    );
    return res.status(201).json({ id: r.insertId });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;

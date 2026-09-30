// ============================================================================
// ARCHIVO: server/routes/documentos.js
// FUNCIÓN GENERAL: CRUD de cartas/oficios/avisos/notificaciones + historial,
//   cambios de estado y registro de adjuntos PDF.
// FLUJO DE DATOS:
//   - ENTRAN: requests autenticados + tablas documentos, documento_historial,
//     adjuntos, tipos_documento.
//   - SALEN: JSON de lista/detalle/historial hacia el front.
// QUÉ MODIFICAR SI hay cambios: agregar estados en ESTADOS; ajustar alcance
//   por área en docVisible y GET /; nuevas validaciones en POST/PATCH.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const express = require("express");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const { conAuth, tienePermiso } = require("../middleware");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA ROUTER Y CONSTANTES ============
const router = express.Router();
router.use(conAuth); // Todas exigen login.

// Carpeta de PDFs (misma que en routes/ia.js): el borrado físico nunca sale de aquí.
const PDF_DIR =
  process.env.PDF_DIR ||
  path.join(__dirname, "..", "..", "documentos", "Sistema legal");

const ESTADOS = new Set([
  "borrador",
  "por_revisar",
  "aprobado",
  "rechazado",
  "notificado",
]);
// ============ AQUÍ TERMINA ROUTER Y CONSTANTES ============

// ============ AQUÍ EMPIEZA FUNCIÓN CATEGORÍADE ============
// QUÉ HACE: categoría del tipo (para checar permiso). 404 si no existe.
async function categoriaDe(idTipo) {
  const [filas] = await pool.query(
    "SELECT id_categoria FROM tipos_documento WHERE id_tipo = ?",
    [idTipo]
  );
  return filas[0] ? filas[0].id_categoria : null;
}
// ============ AQUÍ TERMINA FUNCIÓN CATEGORÍADE ============

// ============ AQUÍ EMPIEZA FUNCIÓN DOCVISIBLE ============
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
      !(u.es_super || (await tienePermiso(u.id_rol, false, d.categoria, accion))))
  ) {
    const e = new Error("Sin acceso al documento");
    e.status = 403;
    throw e;
  }
  return d;
}
// ============ AQUÍ TERMINA FUNCIÓN DOCVISIBLE ============

// ============ AQUÍ EMPIEZA RUTA GET LISTA ============
// GET /api/documentos?estado=&tipo= — lista (máx 500, recientes primero).
router.get("/", async (req, res, next) => {
  try {
    const u = req.usuario;
  let q = `SELECT d.id_documento AS id, d.folio, d.id_tipo, t.nombre AS tipo,
                  d.id_cliente, c.nombre AS cliente, d.estado, d.id_area,
                  d.creado_en, d.actualizado_en,
                  u.nombre AS creador,
                  t.id_categoria AS categoria
           FROM documentos d JOIN tipos_documento t ON t.id_tipo = d.id_tipo
           LEFT JOIN clientes c ON c.id_cliente = d.id_cliente
           LEFT JOIN usuarios u ON u.id_usuario = d.id_creador
           WHERE 1 = 1`; // Base para concatenar filtros.
  const args = [];
  if (!u.admin) {
    q += " AND d.id_area = ?";
    args.push(u.id_area); // No-admin: solo su área.
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
        visibles.push(f); // Filtra por permiso de categoría.
    }
    filas = visibles;
  }
  return res.json(filas);
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET LISTA ============

// ============ AQUÍ EMPIEZA HELPER NOTIFICAR NUEVO/CORREGIDO ============
// QUÉ HACE: fan-out de campanita a supers del área + admins (sin el creador).
// `verbo`: 'creó' (nuevo) o 'corrigió' (editado tras rechazo).
// Nunca rompe la operación principal (errores solo a consola).
async function notificarNuevoDoc({ idDoc, idTipo, folio, area, creadorId, creadorNombre, verbo }) {
  try {
    const [[t]] = await pool.query(
      "SELECT nombre FROM tipos_documento WHERE id_tipo = ?",
      [idTipo]
    );
    const tipoNombre = t ? t.nombre : idTipo;
    const [dests] = await pool.query(
      `SELECT u.id_usuario AS id FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.activo AND u.id_usuario <> ?
         AND (r.nombre = 'Administrador' OR (r.es_super AND u.id_area = ?))`,
      [creadorId, area]
    );
    const titulo = verbo === "corrigió"
      ? `Documento #${idDoc} corregido — ${tipoNombre}`
      : `Nuevo documento #${idDoc} — ${tipoNombre}`;
    const detalle = `${creadorNombre} ${verbo} ${tipoNombre}${folio ? ` (folio ${folio})` : ""}`;
    for (const d of dests) {
      await pool.query(
        `INSERT INTO notificaciones
         (id_usuario, tipo, titulo, detalle, id_documento)
         VALUES (?, 'documento_creado', ?, ?, ?)`,
        [d.id, titulo, detalle, idDoc]
      );
    }
  } catch (eNotif) {
    console.error("Aviso campanita:", eNotif.message);
  }
}
// ============ AQUÍ TERMINA HELPER NOTIFICAR NUEVO/CORREGIDO ============

// ============ AQUÍ EMPIEZA HELPER NOTIFICAR DICTAMEN ============
// QUÉ HACE: avisa SOLO al creador cuando su documento es aprobado/rechazado
// (con el motivo del revisor). No avisa si el revisor es el propio creador.
async function notificarDictamen({ idDoc, idTipo, creadorId, revisorId, revisorNombre, estado, comentario }) {
  if (creadorId === revisorId) return;
  try {
    const [[t]] = await pool.query(
      "SELECT nombre FROM tipos_documento WHERE id_tipo = ?",
      [idTipo]
    );
    const tipoNombre = t ? t.nombre : idTipo;
    const esAprobado = estado === "aprobado";
    const titulo = `Documento #${idDoc} ${esAprobado ? "aprobado" : "rechazado"} — ${tipoNombre}`;
    const detalle = esAprobado
      ? `${revisorNombre} aprobó tu ${tipoNombre}.`
      : `${revisorNombre} rechazó tu ${tipoNombre}. Motivo: ${(comentario ?? "").toString().trim() || "sin motivo indicado"}`;
    await pool.query(
      `INSERT INTO notificaciones
       (id_usuario, tipo, titulo, detalle, id_documento)
       VALUES (?, ?, ?, ?, ?)`,
      [creadorId, esAprobado ? "documento_aprobado" : "documento_rechazado", titulo, detalle, idDoc]
    );
  } catch (eNotif) {
    console.error("Aviso dictamen:", eNotif.message);
  }
}
// ============ AQUÍ TERMINA HELPER NOTIFICAR DICTAMEN ============

// ============ AQUÍ EMPIEZA HELPER FOLIO AUTOMÁTICO ============
// QUÉ HACE: consecutivo atómico PREFIJO-AAAA-NNN por tipo y año (tabla folios).
// El prefijo lo pone el back según el tipo; si el cliente manda folio se respeta.
// OJO: no confundir con los campos de formulario 'folio'/'folioEntrega' de oficios
// (esos son números de oficio que escribe el usuario, no el folio del sistema).
const PREFIJOS = {
  "carta-poder": "CP", "carta-responsiva": "CR", "carta-renuncia": "REN",
  "carta-intencion": "CI", "oficio-peticion": "PET", "oficio-comision": "COM",
  "oficio-resolucion": "RES", "aviso-privacidad": "PRI", "aviso-rescision": "RLA",
  "aviso-funcionamiento": "FUN", "notificacion-general": "NOT",
};
async function siguienteFolio(idTipo) {
  const anio = new Date().getFullYear();
  // Transacción + FOR UPDATE: dos peticiones simultáneas nunca repiten número.
  const connex = await pool.getConnection();
  try {
    await connex.beginTransaction();
    const [[f]] = await connex.query(
      "SELECT ultimo_numero AS n FROM folios WHERE id_tipo = ? AND anio = ? FOR UPDATE",
      [idTipo, anio]
    );
    let n;
    if (!f) {
      await connex.query(
        "INSERT INTO folios (id_tipo, anio, ultimo_numero) VALUES (?, ?, 1)",
        [idTipo, anio]
      );
      n = 1;
    } else {
      n = f.n + 1;
      await connex.query(
        "UPDATE folios SET ultimo_numero = ? WHERE id_tipo = ? AND anio = ?",
        [n, idTipo, anio]
      );
    }
    await connex.commit();
    const pref = PREFIJOS[idTipo] || "DOC";
    return `${pref}-${anio}-${String(n).padStart(3, "0")}`;
  } catch (eTx) {
    await connex.rollback();
    throw eTx;
  } finally {
    connex.release();
  }
}
// ============ AQUÍ TERMINA HELPER FOLIO AUTOMÁTICO ============

// ============ AQUÍ EMPIEZA RUTA POST CREAR ============
// POST /api/documentos — crea en 'borrador' + historial inicial.
// Folio: si no viene (caso normal del front) se genera automático.
router.post("/", async (req, res, next) => {
  try {
    const u = req.usuario;
  const { id_tipo, folio = null, id_cliente = null, id_area = null, datos = {}, contenido = null, modelo_ia = null } = req.body || {};
  const cat = await categoriaDe(id_tipo);
  if (!cat) return res.status(404).json({ detail: "Tipo inexistente" });
  if (!(await tienePermiso(u.id_rol, u.admin, cat, "crear"))) {
    return res
      .status(403)
      .json({ detail: `Sin permiso de crear en '${cat}'` });
  }
  const folioFinal = (folio ?? "").toString().trim() || (await siguienteFolio(id_tipo));
  const area = u.admin && id_area ? id_area : u.id_area; // Solo admin puede forzar área.
  const [r] = await pool.query(
    `INSERT INTO documentos
     (folio, id_tipo, id_cliente, id_creador, id_area, estado, datos, contenido, modelo_ia)
     VALUES (?, ?, ?, ?, ?, 'borrador', ?, ?, ?)`,
    [folioFinal, id_tipo, id_cliente, u.id, area, JSON.stringify(datos), contenido, modelo_ia]
  );
    await pool.query(
      `INSERT INTO documento_historial
       (id_documento, estado_anterior, estado_nuevo, id_responsable, comentario)
       VALUES (?, NULL, 'borrador', ?, 'Creación del documento')`,
      [r.insertId, u.id]
    );
    // Campanita: avisa a supers del área + admins (sin incluir al creador).
    await notificarNuevoDoc({
      idDoc: r.insertId, idTipo: id_tipo, folio: folioFinal, area,
      creadorId: u.id, creadorNombre: u.nombre, verbo: "creó",
    });
    return res.status(201).json({ id: r.insertId, estado: "borrador", folio: folioFinal });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA POST CREAR ============

// ============ AQUÍ EMPIEZA RUTA GET ACTIVIDAD RECIENTE ============
// GET /api/documentos/actividad/reciente?limite=6 — últimas etapas de la
// trazabilidad (para Inicio). No-admin: solo su área. OJO: va ANTES de /:id
// para que Express no la confunda con un id.
router.get("/actividad/reciente", async (req, res, next) => {
  try {
    const u = req.usuario;
    const lim = Math.min(Number(req.query.limite) || 6, 50); // Tope 50.
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
// ============ AQUÍ TERMINA RUTA GET ACTIVIDAD RECIENTE ============

// ============ AQUÍ EMPIEZA RUTA GET DETALLE ============
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
              tamano_bytes, ruta, vigente, subido_en FROM adjuntos
       WHERE id_documento = ? ORDER BY vigente DESC, id_adjunto DESC`,
      [d.id_documento]
    );
    d.datos = typeof d.datos === "string" ? JSON.parse(d.datos) : d.datos; // mysql2 devuelve TEXT.
    d.historial = hist;
    d.adjuntos = adj;
    return res.json(d);
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET DETALLE ============

// ============ AQUÍ EMPIEZA RUTA PATCH ESTADO ============
// PATCH /api/documentos/:id/estado — cambia estado + deja rastro.
router.patch("/:id/estado", async (req, res, next) => {
  try {
    const { estado, comentario = null } = req.body || {};
    if (!ESTADOS.has(estado))
      return res.status(400).json({ detail: "Estado inválido" });
    // El rechazo exige motivos por escrito.
    if (estado === "rechazado" && !(comentario ?? "").toString().trim()) {
      return res.status(400).json({ detail: "El rechazo exige un comentario con los motivos" });
    }
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
    // Campanita: avisa SOLO al creador (aprobado o rechazado + motivo).
    if (estado === "aprobado" || estado === "rechazado") {
      await notificarDictamen({
        idDoc: d.id_documento, idTipo: d.id_tipo, creadorId: d.id_creador,
        revisorId: req.usuario.id, revisorNombre: req.usuario.nombre,
        estado, comentario,
      });
    }
    return res.json({ id: d.id_documento, estado });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA PATCH ESTADO ============

// ============ AQUÍ EMPIEZA RUTA POST ADJUNTO ============
// POST /api/documentos/:id/adjuntos — ficha de un PDF ya almacenado.
router.post("/:id/adjuntos", async (req, res, next) => {
  try {
    const { nombre_archivo, tipo_mime = "application/pdf", tamano_bytes = null, ruta } = req.body || {};
    const d = await docVisible(Number(req.params.id), req.usuario, "modificar");
    if (tipo_mime !== "application/pdf")
      return res.status(400).json({ detail: "Solo se aceptan PDF" }); // CHECK solo-PDF.
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
// ============ AQUÍ TERMINA RUTA POST ADJUNTO ============

// ============ AQUÍ EMPIEZA RUTA PATCH CORREGIR DATOS ============
// PATCH /api/documentos/:id/datos — el creador (o admin) corrige un documento
// en 'borrador' o 'rechazado'. Vuelve a 'borrador' + rastro + avisa a supers/admin.
router.patch("/:id/datos", async (req, res, next) => {
  try {
    const d = await docVisible(Number(req.params.id), req.usuario, "ver");
    if (!(req.usuario.admin || d.id_creador === req.usuario.id)) {
      return res.status(403).json({ detail: "Solo el creador o un admin pueden corregir" });
    }
    if (!["borrador", "rechazado"].includes(d.estado)) {
      return res.status(400).json({ detail: "Solo borrador o rechazado se pueden corregir" });
    }
    const { datos = {}, contenido = null, modelo_ia = null, id_cliente } = req.body || {};
    if (typeof datos !== "object" || Array.isArray(datos)) {
      return res.status(400).json({ detail: "Faltan los datos corregidos" });
    }
    // Vinculación de cliente: si viene en el cuerpo se actualiza, si no se conserva.
    let idCliente = d.id_cliente;
    if (id_cliente !== undefined) {
      if (id_cliente !== null) {
        const [[cli]] = await pool.query(
          "SELECT id_cliente FROM clientes WHERE id_cliente = ? AND activo = TRUE", [id_cliente]);
        if (!cli) return res.status(404).json({ detail: "Cliente inexistente" });
        idCliente = cli.id_cliente;
      } else {
        idCliente = null;
      }
    }
    await pool.query(
      `UPDATE documentos SET datos = ?, contenido = ?, modelo_ia = ?, id_cliente = ?, estado = 'borrador'
       WHERE id_documento = ?`,
      [JSON.stringify(datos), contenido, modelo_ia, idCliente, d.id_documento]
    );
    await pool.query(
      `INSERT INTO documento_historial
       (id_documento, estado_anterior, estado_nuevo, id_responsable, comentario)
       VALUES (?, ?, 'borrador', ?, 'Corrección del creador')`,
      [d.id_documento, d.estado, req.usuario.id]
    );
    // Campanita: el corregido vuelve a revisión (avisa a supers/admin).
    await notificarNuevoDoc({
      idDoc: d.id_documento, idTipo: d.id_tipo, folio: d.folio, area: d.id_area,
      creadorId: d.id_creador, creadorNombre: req.usuario.nombre, verbo: "corrigió",
    });
    return res.json({ id: d.id_documento, estado: "borrador", folio: d.folio });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA PATCH CORREGIR DATOS ============

// ============ AQUÍ EMPIEZA HELPER BORRAR ARCHIVOS FÍSICOS ============
// QUÉ HACE: elimina del disco los PDF del documento (ADJ-01: evita huérfanos).
// Nunca sale de PDF_DIR (basename anti path-traversal); si un archivo falla,
// solo se registra en consola y no rompe el borrado lógico.
function borrarArchivosDoc(nombres) {
  for (const n of nombres || []) {
    try {
      const base = path.basename(String(n || ""));
      if (!/^[\w][\w\-.]*\.pdf$/i.test(base)) continue;
      const ruta = path.join(PDF_DIR, base);
      if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
    } catch (eFs) {
      console.error("Borrado físico:", eFs.message);
    }
  }
}
// ============ AQUÍ TERMINA HELPER BORRAR ARCHIVOS FÍSICOS ============

// ============ AQUÍ EMPIEZA RUTA DELETE DOCUMENTO ============
// DELETE /api/documentos/:id — borra el documento (historial/adjuntos por CASCADE).
// Permiso 'eliminar' en la categoría (admin siempre; super de su área).
router.delete("/:id", async (req, res, next) => {
  try {
    const d = await docVisible(Number(req.params.id), req.usuario, "eliminar");
    const [adj] = await pool.query(
      "SELECT nombre_archivo FROM adjuntos WHERE id_documento = ?",
      [d.id_documento]
    );
    await pool.query("DELETE FROM documentos WHERE id_documento = ?", [d.id_documento]);
    borrarArchivosDoc(adj.map((a) => a.nombre_archivo)); // Limpia huérfanos del disco.
    return res.json({ id: d.id_documento, eliminado: true });
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA DELETE DOCUMENTO ============

// ============ AQUÍ EMPIEZA EXPORTS ============
module.exports = router;
// ============ AQUÍ TERMINA EXPORTS ============

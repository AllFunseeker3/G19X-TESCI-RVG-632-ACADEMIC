// ============================================================================
// ARCHIVO: server/test/api.test.js
// FUNCIÓN GENERAL: pruebas automáticas de la API (node:test + supertest).
//   Cubre 6 reglas críticas del back: bloqueo CC-01, contraseña actual
//   incorrecta, permiso de clientes, rechazo sin motivo, folio consecutivo
//   y descarga de PDF solo para adjuntos visibles.
// FLUJO DE DATOS:
//   - ENTRAN: app Express (sin abrir puerto), MariaDB de server/.env y los
//     5 usuarios base documentados en README (cuentas de prueba por rol).
//   - SALEN: resultados TAP de node:test; los datos temporales se borran y
//     el contador de folios se restaura al terminar.
// QUÉ MODIFICAR SI hay cambios: agregar casos con test(); si cambian las
//   reglas de negocio, ajustar el status esperado. Ejecutar: npm test.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const request = require("supertest");
const app = require("../index");
const pool = require("../db");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA CONSTANTES Y ESTADO ============
// Cuentas demo documentadas en README §3.2.
const ADMIN = { correo: "admin@sislegal.mx", contrasena: "Admin123*" };
const LEGAL = { correo: "legal@sislegal.mx", contrasena: "Legal123*" };
const OPERATIVO = { correo: "operativo@sislegal.mx", contrasena: "Operativo123*" };
const PDF_DIR = path.join(__dirname, "..", "..", "documentos", "Sistema legal");

let adminToken = null; // Token Bearer del admin para los casos.
let legalToken = null; // Token de Legal (puede ver cartas de su área).
let operativoToken = null; // Token del rol sin permiso de cartas/clientes.
let usuarioTemporalId = null; // Usuario creado en el caso 1 (se borra al final).
const documentosCreados = []; // IDs creados en los casos 4, 5 y 6.
let foliosPrevios = []; // Foto de la tabla folios antes de las pruebas.
// ============ AQUÍ TERMINA CONSTANTES Y ESTADO ============

// ============ AQUÍ EMPIEZA HELPERS ============
// QUÉ HACE: login real contra la API y devuelve el JWT.
async function login(correo, contrasena) {
  const r = await request(app).post("/api/auth/login").send({ correo, contrasena });
  assert.equal(r.status, 200, `Login falló para ${correo}: ${JSON.stringify(r.body)}`);
  return r.body.token;
}

// QUÉ HACE: cabecera Authorization para supertest.
function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}
// ============ AQUÍ TERMINA HELPERS ============

// ============ AQUÍ EMPIEZA SETUP ============
before(async () => {
  adminToken = await login(ADMIN.correo, ADMIN.contrasena);
  legalToken = await login(LEGAL.correo, LEGAL.contrasena);
  operativoToken = await login(OPERATIVO.correo, OPERATIVO.contrasena);
  const [filas] = await pool.query(
    "SELECT id_tipo, anio, ultimo_numero FROM folios ORDER BY id_tipo, anio"
  );
  foliosPrevios = filas; // Se restaura completo en after().
});
// ============ AQUÍ TERMINA SETUP ============

// ============ AQUÍ EMPIEZA CASO 1: BLOQUEO CC-01 ============
// Una cuenta con debe_cambiar_contrasena=TRUE no puede usar la API (403),
// salvo la ruta de cambio de contraseña.
test("CC-01: cuenta con cambio pendiente recibe 403 en /api/documentos", async () => {
  const roles = await request(app)
    .get("/api/usuarios/roles")
    .set(bearer(adminToken));
  assert.equal(roles.status, 200);
  const rolLegal = roles.body.find((r) => r.nombre === "Legal");
  assert.ok(rolLegal, "No se encontró el rol Legal en /api/usuarios/roles");

  const alta = await request(app)
    .post("/api/usuarios")
    .set(bearer(adminToken))
    .send({ nombre: "Prueba Automatica", id_rol: rolLegal.id });
  assert.equal(alta.status, 201, JSON.stringify(alta.body));

  usuarioTemporalId = alta.body.id;
  const correo = alta.body.correo;
  const base = correo.split("@")[0];
  // La contraseña temporal es correo + 8 aleatorios (CC-01).
  assert.equal(alta.body.contrasena.length, base.length + 8);
  assert.ok(alta.body.contrasena.startsWith(base));

  const tokenTemporal = await login(correo, alta.body.contrasena);
  const bloqueo = await request(app)
    .get("/api/documentos")
    .set(bearer(tokenTemporal));
  assert.equal(bloqueo.status, 403);
  assert.equal(bloqueo.body.codigo, "CAMBIO_CONTRASENA_REQUERIDO");
});
// ============ AQUÍ TERMINA CASO 1 ============

// ============ AQUÍ EMPIEZA CASO 2: CONTRASEÑA ACTUAL INCORRECTA ============
// El cambio exige validar la contraseña actual (401 si no coincide).
test("CC-01: cambio de contraseña con la actual incorrecta responde 401", async () => {
  const r = await request(app)
    .post("/api/auth/cambiar-contrasena")
    .set(bearer(adminToken))
    .send({ actual: "ClaveIncorrecta123", nueva: "NuevaClave12345" });
  assert.equal(r.status, 401);
  assert.match(r.body.detail, /actual/i);
});
// ============ AQUÍ TERMINA CASO 2 ============

// ============ AQUÍ EMPIEZA CASO 3: PERMISO DE CLIENTES ============
// El rol Operativo (solo oficios) no debe recibir RFC/CURP/domicilio;
// el admin sí conserva acceso al directorio.
test("Clientes: rol sin permiso de cartas recibe 403 y admin sí consulta", async () => {
  const denegado = await request(app)
    .get("/api/clientes")
    .set(bearer(operativoToken));
  assert.equal(denegado.status, 403);
  assert.match(denegado.body.detail, /permiso/i);

  const permitido = await request(app)
    .get("/api/clientes")
    .set(bearer(adminToken));
  assert.equal(permitido.status, 200);
  assert.ok(Array.isArray(permitido.body));
});
// ============ AQUÍ TERMINA CASO 3 ============

// ============ AQUÍ EMPIEZA CASO 4: RECHAZO SIN COMENTARIO ============
// El dictamen de rechazo exige motivo por escrito (400 si viene vacío).
test("Rechazo sin comentario responde 400", async () => {
  const alta = await request(app)
    .post("/api/documentos")
    .set(bearer(adminToken))
    .send({ id_tipo: "carta-poder", datos: {} });
  assert.equal(alta.status, 201, JSON.stringify(alta.body));
  documentosCreados.push(alta.body.id);

  const r = await request(app)
    .patch(`/api/documentos/${alta.body.id}/estado`)
    .set(bearer(adminToken))
    .send({ estado: "rechazado" });
  assert.equal(r.status, 400);
  assert.match(r.body.detail, /comentario/i);
});
// ============ AQUÍ TERMINA CASO 4 ============

// ============ AQUÍ EMPIEZA CASO 5: FOLIO CONSECUTIVO ============
// Dos altas del mismo tipo deben generar PREFIJO-AAAA-NNN y N+1.
test("Folio automático es consecutivo por tipo", async () => {
  const tipo = "carta-responsiva";
  const anio = new Date().getFullYear();

  const crear = () =>
    request(app)
      .post("/api/documentos")
      .set(bearer(adminToken))
      .send({ id_tipo: tipo, datos: {} });

  const primera = await crear();
  assert.equal(primera.status, 201, JSON.stringify(primera.body));
  documentosCreados.push(primera.body.id);

  const segunda = await crear();
  assert.equal(segunda.status, 201, JSON.stringify(segunda.body));
  documentosCreados.push(segunda.body.id);

  const patron = new RegExp(`^CR-${anio}-(\\d{3})$`);
  const n1 = patron.exec(primera.body.folio);
  const n2 = patron.exec(segunda.body.folio);
  assert.ok(n1, `Folio inesperado: ${primera.body.folio}`);
  assert.ok(n2, `Folio inesperado: ${segunda.body.folio}`);
  assert.equal(Number(n2[1]), Number(n1[1]) + 1);
});
// ============ AQUÍ TERMINA CASO 5 ============

// ============ AQUÍ EMPIEZA CASO 6: PDF SOLO SI ES VISIBLE ============
// Legal puede descargar el PDF adjunto a una carta de su área; Operativo no.
// Además, solo admin puede registrar un adjunto externo (no reclamar PDFs).
test("PDF: solo se descarga si el adjunto es visible", async () => {
  const nombre = `seguridad-${Date.now()}.pdf`;
  const ruta = path.join(PDF_DIR, nombre);
  fs.mkdirSync(PDF_DIR, { recursive: true });
  fs.writeFileSync(ruta, "%PDF-1.4\n% prueba de autorización\n", "utf8");
  try {
    const alta = await request(app)
      .post("/api/documentos")
      .set(bearer(legalToken))
      .send({ id_tipo: "carta-poder", datos: {} });
    assert.equal(alta.status, 201, JSON.stringify(alta.body));
    documentosCreados.push(alta.body.id);

    const intentoOperativo = await request(app)
      .post(`/api/documentos/${alta.body.id}/adjuntos`)
      .set(bearer(operativoToken))
      .send({ nombre_archivo: nombre });
    assert.equal(intentoOperativo.status, 403);

    const adjunto = await request(app)
      .post(`/api/documentos/${alta.body.id}/adjuntos`)
      .set(bearer(adminToken))
      .send({ nombre_archivo: nombre });
    assert.equal(adjunto.status, 201, JSON.stringify(adjunto.body));

    const legal = await request(app)
      .get(`/api/ia/pdf/${nombre}`)
      .set(bearer(legalToken));
    assert.equal(legal.status, 200);

    const operativo = await request(app)
      .get(`/api/ia/pdf/${nombre}`)
      .set(bearer(operativoToken));
    assert.equal(operativo.status, 404);
  } finally {
    fs.rmSync(ruta, { force: true });
  }
});
// ============ AQUÍ TERMINA CASO 6 ============

// ============ AQUÍ EMPIEZA LIMPIEZA ============
// Deja la BD como estaba: sin documentos/avisos temporales, sin el usuario
// de prueba y con el contador de folios en su valor previo.
after(async () => {
  try {
    if (documentosCreados.length) {
      const ids = documentosCreados.join(",");
      await pool.query(`DELETE FROM notificaciones WHERE id_documento IN (${ids})`);
      await pool.query(`DELETE FROM documentos WHERE id_documento IN (${ids})`);
    }
    if (usuarioTemporalId) {
      await pool.query("DELETE FROM usuarios WHERE id_usuario = ?", [usuarioTemporalId]);
    }
    // Restaura la tabla folios completa (los casos 4, 5 y 6 consumieron números).
    await pool.query("DELETE FROM folios");
    if (foliosPrevios.length) {
      await pool.query(
        "INSERT INTO folios (id_tipo, anio, ultimo_numero) VALUES ?",
        [foliosPrevios.map((f) => [f.id_tipo, f.anio, f.ultimo_numero])]
      );
    }
  } finally {
    await pool.end();
  }
});
// ============ AQUÍ TERMINA LIMPIEZA ============

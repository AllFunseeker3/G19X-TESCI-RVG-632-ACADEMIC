// ============================================================================
// ARCHIVO: server/aplicar-migracion-limpieza.js
// FUNCIÓN GENERAL: aplica db/migracion_limpieza_01.sql por partes.
//   Quita auditoria (sin uso) y clientes.contacto (fuera del form).
// FLUJO DE DATOS:
//   - ENTRAN: archivo db/migracion_limpieza_01.sql + pool (server/db.js).
//   - SALEN: tabla/columna eliminadas + log LIMPIEZA en consola.
// QUÉ MODIFICAR SI hay cambios: apuntar a otro .sql si cambia la migración;
//   uso: node aplicar-migracion-limpieza.js desde server/.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const fs = require("fs");
const path = require("path");
const pool = require("./db");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA SCRIPT PRINCIPAL ============
(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "db", "migracion_limpieza_01.sql"),
    "utf8"
  );
  const limpio = sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("DELIMITER") && !l.trim().startsWith("--")) // Quita directivas de consola.
    .join("\n")
    .replace(/\$\$/g, ";"); // Normaliza terminador $$ a ;.
  const partes = limpio.split(";").map((s) => s.trim()).filter(Boolean); // Parte por sentencia.
  for (const p of partes) {
    await pool.query(p); // Ejecuta sentencia por sentencia.
  }
  const [tablas] = await pool.query(
    "SELECT TABLE_NAME AS t FROM INFORMATION_SCHEMA.TABLES " +
    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auditoria'"
  );
  const [cols] = await pool.query(
    "SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS " +
    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clientes' " +
    "AND COLUMN_NAME = 'contacto'"
  );
  console.log("LIMPIEZA: auditoria_restante =", tablas.length, ", contacto_restante =", cols.length);
  await pool.end(); // Cierra pool para terminar el proceso.
})().catch((e) => {
  console.error("FALLA:", e.message);
  process.exit(1);
});
// ============ AQUÍ TERMINA SCRIPT PRINCIPAL ============

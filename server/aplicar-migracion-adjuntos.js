// ============================================================================
// ARCHIVO: server/aplicar-migracion-adjuntos.js
// FUNCIÓN GENERAL: aplica db/migracion_adjuntos_vigente.sql por partes.
//   Agrega la columna vigente a adjuntos (idempotente).
// FLUJO DE DATOS:
//   - ENTRAN: archivo db/migracion_adjuntos_vigente.sql + pool (server/db.js).
//   - SALEN: columna vigente en MariaDB + log COLUMNA en consola.
// QUÉ MODIFICAR SI hay cambios: apuntar a otro .sql si cambia la migración;
//   uso: node aplicar-migracion-adjuntos.js desde server/.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const fs = require("fs");
const path = require("path");
const pool = require("./db");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA SCRIPT PRINCIPAL ============
(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "db", "migracion_adjuntos_vigente.sql"),
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
  const [cols] = await pool.query(
    "SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS " +
    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'adjuntos' " +
    "AND COLUMN_NAME IN ('vigente')"
  );
  console.log("COLUMNA:", JSON.stringify(cols.map((r) => r.c)));
  await pool.end(); // Cierra pool para terminar el proceso.
})().catch((e) => {
  console.error("FALLA:", e.message);
  process.exit(1);
});
// ============ AQUÍ TERMINA SCRIPT PRINCIPAL ============

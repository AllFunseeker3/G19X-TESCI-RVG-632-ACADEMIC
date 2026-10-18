// ============================================================================
// ARCHIVO: server/aplicar-migracion-cambio-contrasena.js
// FUNCIÓN GENERAL: aplica db/migracion_cambio_contrasena.sql por partes.
//   Agrega la columna debe_cambiar_contrasena a usuarios (idempotente, CC-01).
// FLUJO DE DATOS:
//   - ENTRAN: archivo db/migracion_cambio_contrasena.sql + pool (server/db.js).
//   - SALEN: columna debe_cambiar_contrasena en MariaDB + log COLUMNA en consola.
// QUÉ MODIFICAR SI hay cambios: apuntar a otro .sql si cambia la migración;
//   uso: node aplicar-migracion-cambio-contrasena.js desde server/.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const fs = require("fs");
const path = require("path");
const pool = require("./db");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA SCRIPT PRINCIPAL ============
(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "db", "migracion_cambio_contrasena.sql"),
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
    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' " +
    "AND COLUMN_NAME IN ('debe_cambiar_contrasena')"
  );
  console.log("COLUMNA:", JSON.stringify(cols.map((r) => r.c)));
  await pool.end(); // Cierra pool para terminar el proceso.
})().catch((e) => {
  console.error("FALLA:", e.message);
  process.exit(1);
});
// ============ AQUÍ TERMINA SCRIPT PRINCIPAL ============

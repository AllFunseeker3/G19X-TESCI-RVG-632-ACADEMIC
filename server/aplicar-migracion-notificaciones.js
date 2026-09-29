// ============================================================================
// ARCHIVO: server/aplicar-migracion-notificaciones.js
// FUNCIÓN GENERAL: aplica db/migracion_notificaciones.sql por partes.
//   Crea la tabla notificaciones (campanita) de forma idempotente.
// FLUJO DE DATOS:
//   - ENTRAN: archivo db/migracion_notificaciones.sql + pool (server/db.js).
//   - SALEN: tabla notificaciones en MariaDB + log TABLA en consola.
// QUÉ MODIFICAR SI hay cambios: apuntar a otro .sql si cambia la migración;
//   uso: node aplicar-migracion-notificaciones.js desde server/.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const fs = require("fs");
const path = require("path");
const pool = require("./db");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA SCRIPT PRINCIPAL ============
(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "db", "migracion_notificaciones.sql"),
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
  const [t] = await pool.query(
    "SELECT COUNT(*) AS n FROM notificaciones"
  );
  console.log("TABLA notificaciones OK, filas:", t[0].n);
  await pool.end(); // Cierra pool para terminar el proceso.
})().catch((e) => {
  console.error("FALLA:", e.message);
  process.exit(1);
});
// ============ AQUÍ TERMINA SCRIPT PRINCIPAL ============

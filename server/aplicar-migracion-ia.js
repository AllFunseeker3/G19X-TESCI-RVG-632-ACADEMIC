// ============================================================================
// ARCHIVO: server/aplicar-migracion-ia.js
// FUNCIÓN GENERAL: aplica db/migracion_ia_contenido.sql por partes.
//   Evita el DELIMITER de consola y verifica columnas contenido/modelo_ia.
// FLUJO DE DATOS:
//   - ENTRAN: archivo db/migracion_ia_contenido.sql + conexión pool (server/db.js).
//   - SALEN: tablas alteradas en MariaDB + log COLUMNAS en consola.
// QUÉ MODIFICAR SI hay cambios: apuntar a otro .sql si cambia la migración;
//   uso: node aplicar-migracion-ia.js desde server/.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
// Aplica db/migracion_ia_contenido.sql por partes (evita DELIMITER de consola).
const fs = require("fs");
const path = require("path");
const pool = require("./db");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA SCRIPT PRINCIPAL ============
(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "db", "migracion_ia_contenido.sql"),
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
    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos' " +
    "AND COLUMN_NAME IN ('contenido','modelo_ia')"
  );
  console.log("COLUMNAS:", JSON.stringify(cols.map((r) => r.c)));
  await pool.end(); // Cierra pool para terminar el proceso.
})().catch((e) => {
  console.error("FALLA:", e.message);
  process.exit(1);
});
// ============ AQUÍ TERMINA SCRIPT PRINCIPAL ============

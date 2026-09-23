// Aplica db/migracion_ia_contenido.sql por partes (evita DELIMITER de consola).
const fs = require("fs");
const path = require("path");
const pool = require("./db");

(async () => {
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "db", "migracion_ia_contenido.sql"),
    "utf8"
  );
  const limpio = sql
    .split("\n")
    .filter((l) => !l.trim().startsWith("DELIMITER") && !l.trim().startsWith("--"))
    .join("\n")
    .replace(/\$\$/g, ";");
  const partes = limpio.split(";").map((s) => s.trim()).filter(Boolean);
  for (const p of partes) {
    await pool.query(p);
  }
  const [cols] = await pool.query(
    "SELECT COLUMN_NAME AS c FROM INFORMATION_SCHEMA.COLUMNS " +
    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos' " +
    "AND COLUMN_NAME IN ('contenido','modelo_ia')"
  );
  console.log("COLUMNAS:", JSON.stringify(cols.map((r) => r.c)));
  await pool.end();
})().catch((e) => {
  console.error("FALLA:", e.message);
  process.exit(1);
});

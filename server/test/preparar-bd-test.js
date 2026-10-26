// ============================================================================
// ARCHIVO: server/test/preparar-bd-test.js
// FUNCIÓN GENERAL: recrea la BD de pruebas `sislegal_test` desde maestro.sql.
//   Borra SOLO una base cuyo nombre termine en `_test`, carga esquema + seeds
//   y concede acceso al usuario de la app. No toca la BD de trabajo.
// FLUJO DE DATOS:
//   - ENTRAN: server/.env.test (DB_NAME, DB_ADMIN_USER/PASSWORD, DB_USER).
//   - SALEN: base limpia con 5 usuarios base para `npm test`.
// QUÉ MODIFICAR SI hay cambios: ejecutar `npm run db:test:prep` en server/.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.test") });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA CONFIG ============
const DB_NAME = process.env.DB_NAME || "sislegal_test";
const DB_ADMIN_USER = process.env.DB_ADMIN_USER || "root";
const DB_ADMIN_PASSWORD = process.env.DB_ADMIN_PASSWORD || "";
const DB_USER = process.env.DB_USER || "sislegal";
const DB_GRANT_HOST = process.env.DB_GRANT_HOST || "localhost";
const MAESTRO = path.join(__dirname, "..", "..", "db", "maestro.sql");

// Guardas: nunca ejecutar DROP sobre la BD de trabajo.
if (!/^[A-Za-z0-9_]+_test$/.test(DB_NAME)) {
  throw new Error("DB_NAME debe terminar en _test (ej. sislegal_test)");
}
if (!/^[A-Za-z0-9_]+$/.test(DB_USER)) {
  throw new Error("DB_USER inválido");
}
if (!/^[A-Za-z0-9_%.]+$/.test(DB_GRANT_HOST)) {
  throw new Error("DB_GRANT_HOST inválido");
}
if (!DB_ADMIN_PASSWORD) {
  throw new Error("Falta DB_ADMIN_PASSWORD en server/.env.test");
}
// ============ AQUÍ TERMINA CONFIG ============

// ============ AQUÍ EMPIEZA PREPARACIÓN ============
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: DB_ADMIN_USER,
    password: DB_ADMIN_PASSWORD,
    multipleStatements: true,
  });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    await conn.query(
      `CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    // maestro.sql crea `sislegal`; se cambian solo las dos sentencias de BD,
    // no los correos ni los datos semilla.
    const sql = fs
      .readFileSync(MAESTRO, "utf8")
      .replace(
        /CREATE DATABASE IF NOT EXISTS sislegal/,
        `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``
      )
      .replace(/^USE sislegal;/m, `USE \`${DB_NAME}\`;`);
    await conn.query(sql);

    if (DB_USER !== DB_ADMIN_USER) {
      await conn.query(
        `GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO ${conn.escape(DB_USER)}@${conn.escape(DB_GRANT_HOST)}`
      );
      await conn.query("FLUSH PRIVILEGES");
    }

    const [[u]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${DB_NAME}\`.usuarios`);
    console.log(`OK: ${DB_NAME} recreada desde maestro.sql (${u.n} usuarios base).`);
  } finally {
    await conn.end();
  }
})().catch((e) => {
  console.error("ERROR preparando la BD de pruebas:", e.message);
  process.exitCode = 1;
});
// ============ AQUÍ TERMINA PREPARACIÓN ============

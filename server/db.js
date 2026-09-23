// ============================================================================
// ARCHIVO: server/db.js
// FUNCIÓN GENERAL: pool de conexiones a MariaDB (BD `sislegal`).
//   Lee server/.env y exporta pool mysql2/promise (utf8mb4, hasta 10 conex).
// FLUJO DE DATOS:
//   - ENTRAN: DB_HOST/PORT/USER/PASSWORD/NAME de server/.env.
//   - SALEN: pool.query() la usan middleware.js y routes/*.js por request.
// ============================================================================
require("dotenv").config();
const mysql = require("mysql2/promise");

// QUÉ HACE: pool reutilizable (no abrir una conexión por request).
// QUIÉN LO USA: todo el server vía pool.query()/pool.execute().
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sislegal",
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;

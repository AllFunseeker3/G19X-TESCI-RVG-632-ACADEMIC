// ============================================================================
// ARCHIVO: server/db.js
// FUNCIÓN GENERAL: pool de conexiones a MariaDB (BD `sislegal`).
//   Reutiliza conexiones para todas las rutas vía mysql2/promise.
// FLUJO DE DATOS:
//   - ENTRAN: DB_HOST/PORT/USER/PASSWORD/NAME de server/.env.
//   - SALEN: pool.query() la usan middleware.js y routes/*.js por request.
// QUÉ MODIFICAR SI hay cambios: ajustar credenciales en server/.env;
//   cambiar connectionLimit si crece la concurrencia.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
require("dotenv").config();
const mysql = require("mysql2/promise");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA POOL DE CONEXIONES ============
// QUÉ HACE: pool reutilizable (no abrir una conexión por request).
// QUIÉN LO USA: todo el server vía pool.query()/pool.execute().
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sislegal",
  charset: "utf8mb4", // Soporta acentos y ñ.
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0, // Cola ilimitada de espera.
});

module.exports = pool;
// ============ AQUÍ TERMINA POOL DE CONEXIONES ============

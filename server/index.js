// ============================================================================
// ARCHIVO: server/index.js
// FUNCIÓN GENERAL: arranca la API SisLegal (Express + MariaDB).
//   Monta las rutas /api/* y el manejador global de errores JSON.
// FLUJO DE DATOS:
//   - ENTRAN: requests HTTP del front + server/.env (API_PORT).
//   - SALEN: respuestas JSON hacia el front vía routes/*.js.
// QUÉ MODIFICAR SI hay cambios: agregar routers con app.use; ajustar CORS
//   si cambia el puerto del front; puerto API en API_PORT.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const auth = require("./routes/auth");
const catalogo = require("./routes/catalogo");
const documentos = require("./routes/documentos");
const usuarios = require("./routes/usuarios");
const salud = require("./routes/salud");
const ia = require("./routes/ia");
const notificaciones = require("./routes/notificaciones");
const clientes = require("./routes/clientes");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA CONFIGURACIÓN APP ============
const app = express();
app.use(express.json()); // Parsea cuerpos JSON.

// Front Vite en dev. Si cambias su puerto, agrégalo aquí.
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
// ============ AQUÍ TERMINA CONFIGURACIÓN APP ============

// ============ AQUÍ EMPIEZA MONTAJE DE RUTAS ============
app.use("/api/auth", auth);
app.use("/api/catalogo", catalogo);
app.use("/api/documentos", documentos);
app.use("/api/usuarios", usuarios);
app.use("/api/ia", ia);
app.use("/api/notificaciones", notificaciones);
app.use("/api/clientes", clientes);
app.use("/api", salud);
// ============ AQUÍ TERMINA MONTAJE DE RUTAS ============

// ============ AQUÍ EMPIEZA RUTA RAÍZ ============
// GET / — info mínima (la salud real está en /api/salud).
app.get("/", (_req, res) => res.json({ api: "SisLegal", docs: "/api/salud" }));
// ============ AQUÍ TERMINA RUTA RAÍZ ============

// ============ AQUÍ EMPIEZA MANEJADOR DE ERRORES ============
// Errores no controlados -> JSON (sin filtrar SQL al cliente en 500s).
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err); // 403/404 esperados no ensucian la consola
  // En 500 no se manda err.message (puede traer fragmentos de SQL); solo log.
  const detail =
    status >= 500 ? "Error interno" : err.message || "Error interno";
  res.status(status).json({ detail });
});
// ============ AQUÍ TERMINA MANEJADOR DE ERRORES ============

// ============ AQUÍ EMPIEZA ARRANQUE ============
const PORT = Number(process.env.API_PORT || 8000);
app.listen(PORT, () => console.log(`SisLegal API en http://localhost:${PORT}`));
// ============ AQUÍ TERMINA ARRANQUE ============

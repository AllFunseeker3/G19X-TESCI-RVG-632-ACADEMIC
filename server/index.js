// ============================================================================
// ARCHIVO: server/index.js
// FUNCIÓN GENERAL: arranca la API SisLegal (Express + MariaDB).
// ARRANQUE: npm start  (o npm run dev con --watch)  -> http://localhost:8000
// RUTAS: /api/auth, /api/catalogo, /api/documentos, /api/usuarios, /api/salud.
// ============================================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const auth = require("./routes/auth");
const catalogo = require("./routes/catalogo");
const documentos = require("./routes/documentos");
const usuarios = require("./routes/usuarios");
const salud = require("./routes/salud");

const app = express();
app.use(express.json());

// Front Vite en dev. Si cambias su puerto, agrégalo aquí.
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);

app.use("/api/auth", auth);
app.use("/api/catalogo", catalogo);
app.use("/api/documentos", documentos);
app.use("/api/usuarios", usuarios);
app.use("/api", salud);

// GET / — info mínima (la salud real está en /api/salud).
app.get("/", (_req, res) => res.json({ api: "SisLegal", docs: "/api/salud" }));

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

const PORT = Number(process.env.API_PORT || 8000);
app.listen(PORT, () => console.log(`SisLegal API en http://localhost:${PORT}`));

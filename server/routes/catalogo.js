// ============================================================================
// ARCHIVO: server/routes/catalogo.js
// FUNCIÓN GENERAL: lee el catálogo (categorías, tipos y campos dinámicos).
//   Refleja tiposDocumentos.js del front para el formulario dinámico.
// FLUJO DE DATOS:
//   - ENTRAN: tablas categorias, tipos_documento, campos_tipo (requiere auth).
//   - SALEN: JSON hacia el front (selects y definición de formularios).
// QUÉ MODIFICAR SI hay cambios: ajustar mapeo cond_campo/cond_valor->mostrarSi
//   si cambia el front; agregar filtros por categoría aquí.
// ============================================================================
// ============ AQUÍ EMPIEZA IMPORTS ============
const express = require("express");
const pool = require("../db");
const { conAuth } = require("../middleware");
// ============ AQUÍ TERMINA IMPORTS ============

// ============ AQUÍ EMPIEZA ROUTER Y AUTH ============
const router = express.Router();
router.use(conAuth); // Todas exigen login.
// ============ AQUÍ TERMINA ROUTER Y AUTH ============

// ============ AQUÍ EMPIEZA RUTA GET CATEGORÍAS ============
// GET /api/catalogo/categorias — Campo 1 del front.
router.get("/categorias", async (_req, res, next) => {
  try {
    const [filas] = await pool.query(
      "SELECT id_categoria AS id, nombre FROM categorias WHERE activa = TRUE ORDER BY id_categoria"
    );
    return res.json(filas);
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET CATEGORÍAS ============

// ============ AQUÍ EMPIEZA RUTA GET TIPOS ============
// GET /api/catalogo/tipos?categoria=oficios — Campo 2 del front.
router.get("/tipos", async (req, res, next) => {
  try {
    const [filas] = await pool.query(
      "SELECT id_tipo AS id, nombre FROM tipos_documento WHERE id_categoria = ? AND activo = TRUE ORDER BY id_tipo",
      [req.query.categoria]
    );
    return res.json(filas);
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET TIPOS ============

// ============ AQUÍ EMPIEZA FUNCIÓN LISTAOPCIONES ============
// QUÉ HACE: normaliza `opciones` a lista JS. mysql2 a veces ya lo devuelve
// parseado (objeto) y a veces como texto; además tolera CSV simple.
function listaOpciones(valor) {
  if (valor === null || valor === undefined) return null;
  if (Array.isArray(valor)) return valor;
  if (typeof valor === "string") {
    try {
      const p = JSON.parse(valor);
      return Array.isArray(p) ? p : [p]; // Envuelve valor único.
    } catch {
      return valor
        .split(",") // Fallback CSV simple.
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [valor]; // Número/objeto suelto -> lista de uno.
}
// ============ AQUÍ TERMINA FUNCIÓN LISTAOPCIONES ============

// ============ AQUÍ EMPIEZA RUTA GET CAMPOS DEL TIPO ============
// GET /api/catalogo/tipos/:id/campos — definición del formulario dinámico.
// Mapeo a tiposDocumentos.js: cond_campo/cond_valor -> mostrarSi ('true' = true).
router.get("/tipos/:id/campos", async (req, res, next) => {
  try {
    const [filas] = await pool.query(
      `SELECT campo AS id, etiqueta, tipo_campo AS tipo, requerido, opciones,
              filas, ayuda, cond_campo, cond_valor
       FROM campos_tipo WHERE id_tipo = ? ORDER BY orden`,
      [req.params.id]
    );
    return res.json(
      filas.map((f) => {
        const campo = { ...f, requerido: f.requerido === 1 }; // Normaliza a booleano.
        campo.opciones = listaOpciones(campo.opciones);
        if (campo.cond_campo) {
          campo.mostrarSi = {
            campo: campo.cond_campo,
            valor: campo.cond_valor === "true" ? true : campo.cond_valor, // 'true' string -> boolean.
          };
        }
        delete campo.cond_campo; // Limpia campos internos de BD.
        delete campo.cond_valor;
        return campo;
      })
    );
  } catch (e) {
    return next(e);
  }
});
// ============ AQUÍ TERMINA RUTA GET CAMPOS DEL TIPO ============

// ============ AQUÍ EMPIEZA EXPORTS ============
module.exports = router;
// ============ AQUÍ TERMINA EXPORTS ============

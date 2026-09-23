/* ============================================================================
 * ARCHIVO: src/lib/utils/utils.js
 * FUNCIÓN GENERAL: utilidades de estilos (variante JS puro del helper cn).
 *   Combina clases condicionales con clsx y resuelve conflictos de Tailwind
 *   con tailwind-merge. Duplicado tipado en src/lib/utils.ts.
 * QUIÉN LO CONSUME: actualmente sin consumidores en src (grep solo halla su
 *   definición); listo para componentes que importen { cn } desde esta ruta.
 * DE DÓNDE VIENEN los datos: parámetros que pasa cada componente consumidor
 *   (strings, arreglos, objetos condicionales).
 * ========================================================================== */
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// QUÉ HACE cn: recibe N fragmentos de clase y devuelve el string final sin
//   conflictos (twMerge(clsx(inputs))).
// ESTRUCTURA: (...inputs) => string.
// QUÉ MODIFICAR SI se agrega un helper nuevo: exportarlo aquí debajo sin
//   tocar cn (ej. export function formatearFecha...).
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

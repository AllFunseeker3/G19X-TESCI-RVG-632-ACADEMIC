/* ============================================================================
 * ARCHIVO: src/lib/utils.ts
 * FUNCIÓN GENERAL: utilidades de estilos (variante TypeScript del helper cn).
 *   Combina clases condicionales con clsx y resuelve conflictos de Tailwind
 *   con tailwind-merge.
 * QUIÉN LO CONSUME: actualmente sin consumidores en src (grep solo halla su
 *   definición); listo para componentes tipo shadcn/ui que importen { cn }.
 *   Duplicado en JS puro en src/lib/utils/utils.js (misma función, sin tipos).
 * DE DÓNDE VIENEN los datos: parámetros ClassValue[] que pasa cada
 *   componente consumidor (strings, arreglos, objetos condicionales).
 * ========================================================================== */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// QUÉ HACE cn: recibe N fragmentos de clase (inputs: ClassValue[]) y devuelve
//   el string final de clases sin conflictos (twMerge(clsx(inputs))).
// ESTRUCTURA: (...inputs: ClassValue[]) => string.
// QUÉ MODIFICAR SI se agrega un helper nuevo: exportarlo aquí debajo sin
//   tocar cn (ej. export function formatearFecha...).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

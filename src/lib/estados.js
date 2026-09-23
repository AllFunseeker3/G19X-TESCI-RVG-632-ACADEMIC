// ============================================================================
// ARCHIVO: src/lib/estados.js
// FUNCIÓN GENERAL: etiquetas y colores de los estados del flujo documental.
//   La API usa códigos (borrador, por_revisar...); la UI muestra etiquetas
//   (Borrador, Por revisar...). Centraliza el mapeo para no duplicarlo.
// FLUJO DE DATOS:
//   - ENTRAN: código de estado de server/routes/documentos.js.
//   - SALEN: Components/EstadoChip.jsx, Pages/Revision.jsx,
//     Pages/Seguimiento.jsx, Pages/Inicio.jsx y Components/TablaGeneral.jsx.
// QUÉ MODIFICAR SI hay cambios: agrega el estado en ETIQUETA_ESTADO y su
//   color en COLOR_POR_ESTADO (claves = códigos de la API).
// ============================================================================

// Código API -> etiqueta visible.
export const ETIQUETA_ESTADO = {
  borrador: "Borrador",
  por_revisar: "Por revisar",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  notificado: "Notificado",
};

// QUÉ HACE: código ('por_revisar') o etiqueta ('Por revisar') -> etiqueta.
// Acepta ambas para no romper componentes que aún usen etiquetas.
export function estadoBonito(estado) {
  if (!estado) return "—";
  if (ETIQUETA_ESTADO[estado]) return ETIQUETA_ESTADO[estado];
  return estado;
}

// QUÉ HACE: etiqueta visible -> código API (para filtros y PATCH).
export function estadoCodigo(etiqueta) {
  const par = Object.entries(ETIQUETA_ESTADO).find(([, v]) => v === etiqueta);
  return par ? par[0] : etiqueta;
}

// QUÉ HACE: código API -> color MUI del chip (mismos que TablaGeneral).
export const COLOR_POR_ESTADO = {
  borrador: "default",
  por_revisar: "warning",
  aprobado: "success",
  rechazado: "error",
  notificado: "info",
};

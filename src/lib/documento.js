// ============================================================================
// ARCHIVO: src/lib/documento.js
// FUNCIÓN GENERAL: prepara los datos del formulario para la API (JSON seguro)
//   y detecta los anexos PDF que todavía no viven en el servidor.
// FLUJO DE DATOS:
//   - ENTRAN: datos capturados (File[] de fotos/anexos) y campos del catálogo.
//   - SALEN: objeto plano para redactar/crear/actualizar/generar PDF y la lista
//     de File[] pendientes de subir.
// QUÉ MODIFICAR SI hay nuevos tipos de archivo en el formulario: ajusta el
//   mapeo de arrays aquí.
// ============================================================================

// ============ AQUÍ EMPIEZA SERIALIZACIÓN DE DATOS ============
// Convierte datos a JSON seguro (File[] de fotos/anexos -> nombres).
export function datosSerializables(datos) {
  const plano = {};
  Object.entries(datos).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      plano[k] = v.map((a) => (typeof a === 'string' ? a : a?.name ?? ''));
    } else {
      plano[k] = v;
    }
  });
  return plano;
}

// Archivos PDF del formulario que aún no viven en el servidor (los nombres
// que vienen de ?editar= son strings y no se re-suben).
export function archivosAnexosPendientes(campos, datos) {
  return campos
    .filter((c) => c.tipo === 'anexos')
    .flatMap((c) => (Array.isArray(datos[c.id]) ? datos[c.id] : []))
    .filter((a) => a && typeof a !== 'string');
}
// ============ AQUÍ TERMINA SERIALIZACIÓN DE DATOS ============

// ============================================================================
// ARCHIVO: src/lib/anexos.js
// FUNCIÓN GENERAL: valida que un anexo sea un PDF real (firma %PDF-) antes de
//   mandarlo al servidor, arma el mensaje de rechazo y limpia los inválidos.
// FLUJO DE DATOS:
//   - ENTRAN: File[] elegidos en el input de anexos o pendientes de reintento.
//   - SALEN: { validos, invalidos }, texto para el error del campo y un nuevo
//     objeto `datos` sin los anexos rechazados.
// QUÉ MODIFICAR SI cambia la firma aceptada: FIRMA_PDF y esPdfReal.
// ============================================================================

// ============ AQUÍ EMPIEZA VALIDACIÓN DE PDF ============
const FIRMA_PDF = '%PDF-';
const BYTES_FIRMA = FIRMA_PDF.length;

// Lee los primeros bytes y confirma la firma real (ni la extensión ni el MIME
// que manda el navegador garantizan que sea un PDF).
export async function esPdfReal(archivo) {
  if (!archivo || typeof archivo.slice !== 'function') return false;
  try {
    const bytes = new Uint8Array(await archivo.slice(0, BYTES_FIRMA).arrayBuffer());
    return String.fromCharCode(...bytes) === FIRMA_PDF;
  } catch {
    return false;
  }
}

// Separa los archivos elegidos en válidos e inválidos (con sus nombres).
export async function clasificarAnexos(archivos) {
  const revisados = await Promise.all(
    (archivos ?? []).map(async (archivo) => ({ archivo, ok: await esPdfReal(archivo) }))
  );
  return {
    validos: revisados.filter((r) => r.ok).map((r) => r.archivo),
    invalidos: revisados.filter((r) => !r.ok).map((r) => r.archivo?.name ?? 'archivo'),
  };
}

// Mensaje para el campo: nombra los archivos y aclara qué sí se agregó.
export function mensajeAnexosInvalidos(invalidos, agregados = 0) {
  if (!invalidos?.length) return '';
  const lista = invalidos.join(', ');
  const motivo = invalidos.length === 1
    ? `${lista}: no es un PDF válido`
    : `${lista}: no son PDF válidos`;
  return agregados > 0
    ? `${motivo}. Se agregaron ${agregados} PDF válido(s).`
    : motivo;
}

// Quita del estado los anexos cuyo nombre está en la lista (para el reintento).
export function sinAnexosConNombre(datos, nombres) {
  const fuera = new Set(nombres ?? []);
  if (fuera.size === 0) return datos;
  const copia = { ...datos };
  Object.entries(copia).forEach(([k, v]) => {
    if (Array.isArray(v)) {
      copia[k] = v.filter((a) => typeof a === 'string' || !fuera.has(a?.name));
    }
  });
  return copia;
}
// ============ AQUÍ TERMINA VALIDACIÓN DE PDF ============

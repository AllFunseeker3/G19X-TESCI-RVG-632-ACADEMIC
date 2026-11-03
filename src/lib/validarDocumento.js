// ============================================================================
// ARCHIVO: src/lib/validarDocumento.js
// FUNCIÓN GENERAL: valida categoría, tipo y campos visibles del formulario
//   dinámico antes de abrir el Resumen y redactar.
// FLUJO DE DATOS:
//   - ENTRAN: categoría, tipo, campos visibles del catálogo, datos capturados
//     y las banderas del destinatario opcional (GenerarCarta).
//   - SALEN: objeto { campoId: mensaje } vacío si todo es válido.
// QUÉ MODIFICAR SI hay cambios: reglas por tipo de campo (fecha, moneda, email,
//   fotos, anexos, check/switch) o los mensajes de error.
// ============================================================================
import { esFechaValida } from './fechas';

// ============ AQUÍ EMPIEZA VALIDACIÓN DE DOCUMENTO ============
// Revisa requeridos/formatos y devuelve los errores encontrados.
export function validarDocumento({
  categoria,
  tipoDoc,
  campos,
  datos,
  mostrarDestinatario,
  agregarDestinatario,
}) {
  const nuevosErrores = {};
  if (categoria === '') nuevosErrores.categoria = 'Seleccione la categoría';
  if (tipoDoc === '') nuevosErrores.tipoDoc = 'Seleccione el tipo de documento';
  campos.forEach((c) => {
    const valor = datos[c.id];
    if (c.tipo === 'fotos') {
      if (c.requerido && (!Array.isArray(valor) || valor.length === 0)) {
        nuevosErrores[c.id] = 'Agregue al menos una foto';
      }
    } else if (c.tipo === 'anexos') {
      if (c.requerido && (!Array.isArray(valor) || valor.length === 0)) {
        nuevosErrores[c.id] = 'Agregue al menos un anexo PDF';
      }
    } else if (c.tipo === 'check' || c.tipo === 'switch') {
      if (c.requerido && !valor) {
        nuevosErrores[c.id] = 'Debe aceptar esta opción';
      }
    } else if (c.tipo === 'fecha') {
      if (c.requerido && !(valor ?? '').toString().trim()) {
        nuevosErrores[c.id] = 'Este campo es obligatorio';
      } else if ((valor ?? '').toString().trim() && !esFechaValida(valor)) {
        nuevosErrores[c.id] = 'Fecha inválida (dd/mm/aaaa)';
      }
    } else if (c.tipo === 'moneda') {
      if (c.requerido && !(valor ?? '').toString().trim()) {
        nuevosErrores[c.id] = 'Este campo es obligatorio';
      } else if ((valor ?? '').toString().trim() && Number.isNaN(Number(valor))) {
        nuevosErrores[c.id] = 'Monto inválido';
      }
    } else if (c.requerido && !(valor ?? '').toString().trim()) {
      nuevosErrores[c.id] = 'Este campo es obligatorio';
    }
    if (c.tipo === 'email' && (valor ?? '').toString().trim()) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
      if (!ok) nuevosErrores[c.id] = 'Correo inválido';
    }
  });
  if (mostrarDestinatario && agregarDestinatario && !(datos.destinatario ?? '').toString().trim()) {
    nuevosErrores.destinatario = 'Este campo es obligatorio';
  }
  return nuevosErrores;
}
// ============ AQUÍ TERMINA VALIDACIÓN DE DOCUMENTO ============

// ============================================================================
// ARCHIVO: src/lib/fechas.js
// FUNCIÓN GENERAL: helpers de fecha dd/mm/aaaa compartidos por el formulario
//   dinámico (máscara/picker) y por la validación.
// FLUJO DE DATOS:
//   - ENTRAN: cadenas de fecha capturadas en el front o Date del sistema.
//   - SALEN: booleanos de validez, hoy formateado e ISO convertido a dd/mm/aaaa.
// QUÉ MODIFICAR SI cambia el formato de fecha: aquí y en Components/CampoFormulario
//   (máscara y picker nativo).
// ============================================================================

// ============ AQUÍ EMPIEZA HELPERS DE FECHA ============
// Helpers de fecha dd/mm/aaaa (los usa GenerarCarta para validar y auto-hoy).
export function formatearHoyDDMMAAAA() {
  const h = new Date();
  const dd = String(h.getDate()).padStart(2, '0');
  const mm = String(h.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${h.getFullYear()}`;
}

// Valida dd/mm/aaaa real (días por mes, bisiestos, año razonable).
export function esFechaValida(v) {
  if (typeof v !== 'string') return false;
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const aa = Number(m[3]);
  if (aa < 1900 || aa > 2100) return false;
  if (mm < 1 || mm > 12) return false;
  const dias = new Date(aa, mm, 0).getDate();
  return dd >= 1 && dd <= dias;
}

// Convierte ISO yyyy-mm-dd (picker nativo) -> dd/mm/aaaa.
export function isoA_ddmmaaaa(iso) {
  const m = typeof iso === 'string' && iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// Convierte dd/mm/aaaa -> ISO yyyy-mm-dd (para precargar el picker nativo).
export function ddmmaaaaA_iso(v) {
  const m = typeof v === 'string' && v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}
// ============ AQUÍ TERMINA HELPERS DE FECHA ============

// ============================================================================
// ARCHIVO: src/Components/AlertaGuardado.jsx
// FUNCIÓN GENERAL: aviso de éxito tras guardar el documento (folio, PDF y
//   anexos subidos), con descarga y reintento de anexos.
// FLUJO DE DATOS:
//   - ENTRAN: objeto guardado (id, folio, archivo, anexos, avisoAnexos),
//     editandoId, bandera de reintento y handlers del padre.
//   - SALEN: solo visual; descargar/reintentar/cerrar delegan en GenerarCarta.
// QUÉ MODIFICAR SI hay cambios: texto del aviso o botones de descarga/reintento.
// ============================================================================
import { Alert, Button, Box } from '@mui/material';

// ============ AQUÍ EMPIEZA ALERTA GUARDADO ============
export default function AlertaGuardado({
  guardado,
  editandoId,
  reintentandoAnexos,
  onDescargar,
  onReintentar,
  onCerrar,
}) {
  if (!guardado) return null;

  return (
    <Alert
      severity={guardado.avisoAnexos ? 'warning' : 'success'}
      sx={{ mt: 2 }}
      onClose={onCerrar}
    >
      Documento #{guardado.id}{guardado.folio ? ` (folio ${guardado.folio})` : ''} {editandoId ? 'corregido (regresó a revisión con redacción IA' : 'guardado en revisión (con redacción IA'}
      {guardado.archivo ? ' y PDF' : ''}).
      {guardado.anexos > 0 && ` ${guardado.anexos} anexo(s) guardado(s) en el servidor.`}
      {guardado.archivo && (
        <Button size="small" onClick={onDescargar} sx={{ ml: 1, color: 'encabezado.main' }}>
          Descargar PDF
        </Button>
      )}
      {guardado.avisoAnexos && (
        <Box component="span" sx={{ display: 'block', mt: 1 }}>
          <strong>{guardado.avisoAnexos}</strong>
          <Button
            size="small"
            onClick={onReintentar}
            disabled={reintentandoAnexos}
            sx={{ ml: 1 }}
          >
            {reintentandoAnexos ? 'Reintentando...' : 'Reintentar anexos'}
          </Button>
        </Box>
      )}
    </Alert>
  );
}
// ============ AQUÍ TERMINA ALERTA GUARDADO ============

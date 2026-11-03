// ============================================================================
// ARCHIVO: src/Components/DialogoRedaccionIA.jsx
// FUNCIÓN GENERAL: diálogo de preview de la redacción IA (solo lectura, retro
//   para corregir y confirmación final).
// FLUJO DE DATOS:
//   - ENTRAN: estado de GenerarCarta (abierto, textos, errores, progreso y
//     banderas de carga) y los handlers de corregir/volver/guardar/cerrar.
//   - SALEN: solo visual; las acciones delegan en el padre.
// QUÉ MODIFICAR SI hay cambios: textos del preview, botones del pie o el
//   bloque de progreso (Components/ProgresoIA.jsx).
// ============================================================================
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, TextField, Alert, Box,
} from '@mui/material';
import ProgresoIA from './ProgresoIA';

// ============ AQUÍ EMPIEZA DIÁLOGO IA ============
export default function DialogoRedaccionIA({
  abierto,
  titulo,
  cargando,
  corrigiendo,
  guardando,
  fases,
  fase,
  progreso,
  segundos,
  modelo,
  errorIa,
  errorGuardar,
  texto,
  retro,
  onRetro,
  onCerrar,
  onCorregir,
  onVolver,
  onGuardar,
}) {
  const ocupado = cargando || corrigiendo || guardando;
  // Mismo criterio que antes: el cierre libre solo se bloquea al cargar/guardar.
  const cerrarSiLibre = () => {
    if (!cargando && !guardando) onCerrar();
  };

  return (
    <Dialog open={abierto} onClose={cerrarSiLibre} maxWidth="md" fullWidth>
      <DialogTitle color="encabezado.main" fontWeight="bold">
        {titulo}
      </DialogTitle>
      <DialogContent dividers>
        {ocupado && (
          <ProgresoIA
            fases={fases}
            indice={fase}
            progreso={progreso}
            segundos={segundos}
            modelo={modelo}
          />
        )}
        {errorIa && (
          <Alert severity="error" sx={{ mb: 2 }}>{errorIa}</Alert>
        )}
        {errorGuardar && (
          <Alert severity="error" sx={{ mb: 2 }}>{errorGuardar}</Alert>
        )}
        {texto && (
          <>
            <Typography
              variant="body1"
              sx={{ whiteSpace: 'pre-wrap', mb: 2 }}
            >
              {texto}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Modelo: {modelo} · Revisa el texto antes de guardar.
            </Typography>
            <TextField
              label="¿Algo está mal? Describe qué corregir (ej. cambia la vigencia a 1 año, agrega el folio...)"
              multiline
              minRows={2}
              fullWidth
              value={retro}
              onChange={(e) => onRetro(e.target.value)}
              disabled={ocupado}
              sx={{ mb: 1 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={onCorregir}
                disabled={ocupado || !texto || !(retro ?? '').trim()}
                sx={{ borderColor: 'encabezado.main', color: 'encabezado.main' }}
              >
                {corrigiendo ? 'Corrigiendo...' : 'Corregir'}
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onVolver} disabled={ocupado} sx={{ color: 'encabezado.main' }}>
          Volver a datos
        </Button>
        <Button onClick={onCerrar} disabled={ocupado} sx={{ color: 'encabezado.main' }}>
          Cerrar
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onGuardar}
          disabled={ocupado || !texto}
        >
          {guardando ? 'Generando...' : 'Confirmar y guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
// ============ AQUÍ TERMINA DIÁLOGO IA ============

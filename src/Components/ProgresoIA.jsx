// ============================================================================
// ARCHIVO: src/Components/ProgresoIA.jsx
// FUNCIÓN GENERAL: barra de progreso por fases para operaciones IA
//   (redactar / corregir / guardar). El back es una sola petición HTTP sin
//   eventos intermedios, así que el % es estimado por temporizador (0→90%
//   mientras trabaja, 100% al terminar) + fase textual + cronómetro.
// FLUJO DE DATOS:
//   - ENTRAN: fases[], indice, progreso (0-100), segundos, modelo.
//   - SALEN: solo visual (LinearProgress + fase + tiempo).
// QUÉ MODIFICAR SI hay cambios: textos de fases se definen en GenerarCarta.jsx.
// ============================================================================
import { Box, Typography, LinearProgress, Stepper, Step, StepLabel } from '@mui/material';

export default function ProgresoIA({ fases = [], indice = 0, progreso = 0, segundos = 0, modelo = '' }) {
  const faseTxt = fases[Math.min(indice, fases.length - 1)] ?? 'Trabajando…';
  return (
    <Box sx={{ py: 2 }}>
      {/* ============ AQUÍ EMPIEZA BARRA Y FASE ============ */}
      <Typography variant="body2" fontWeight="bold" color="encabezado.main" sx={{ mb: 1 }}>
        {faseTxt}… {Math.round(progreso)}%
      </Typography>
      <LinearProgress variant="determinate" value={Math.min(100, Math.max(0, progreso))} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
      <Typography variant="caption" color="text.secondary">
        {segundos}s transcurridos{modelo ? ` · ${modelo}` : ''} · Pool gratuito. tiempos de espera mayores a los normales.
      </Typography>
      {/* ============ AQUÍ TERMINA BARRA Y FASE ============ */}
      {/* ============ AQUÍ EMPIEZA STEPPER DE FASES ============ */}
      {fases.length > 1 && (
        <Stepper activeStep={Math.min(indice, fases.length - 1)} alternativeLabel sx={{ mt: 2 }}>
          {fases.map((f) => (
            <Step key={f}>
              <StepLabel>{f}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}
      {/* ============ AQUÍ TERMINA STEPPER DE FASES ============ */}
    </Box>
  );
}

// ============================================================================
// ARCHIVO: src/Pages/Configuracion.jsx
// FUNCIÓN GENERAL: Pantalla de personalización de apariencia.
//   Switch de modo oscuro, selector de color de menú y restablecer tema.
// FLUJO DE DATOS:
//   - ENTRAN: de Components/ThemeModeProvider.jsx (mode, accentId, handlers).
//   - SALEN: a theme.js (ACCENTOS) y al ThemeModeProvider (cambio global).
// QUÉ MODIFICAR SI hay cambios: agregar opciones dentro del Stack principal.
// ============================================================================
import { Box, Button, Card, CardContent, Divider, Stack, Switch, Typography } from '@mui/material';
import { useThemeMode } from '../Components/ThemeModeProvider.jsx';
import { ACCENTOS } from '../theme.js';

// ============ AQUÍ EMPIEZA LISTA DE ACENTOS ============
// Catálogo de colores disponibles (derivado de theme.js).
const LISTA_ACENTOS = Object.values(ACCENTOS);
// ============ AQUÍ TERMINA LISTA DE ACENTOS ============

// ============ AQUÍ EMPIEZA CONFIGURACIÓN ============
// Página de ajustes de tema (oscuro + acento del menú).
export default function Configuracion() {
  // Estado global del tema (modo, acento y acciones).
  const { mode, accentId, oscuro, alternarModo, elegirAcento, restablecer } = useThemeMode();

  return (
    // ============ AQUÍ EMPIEZA CONTENEDOR CONFIGURACIÓN ============
    <Box sx={{ p: 2, width: '100%' }}>
      {/* ============ AQUÍ EMPIEZA TARJETA CONFIGURACIÓN ============ */}
      <Card sx={{ maxWidth: 920, mx: 'auto', borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={800} color="encabezado.main" sx={{ mb: 1 }}>
            Configuración
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Personaliza la apariencia del sistema según el estilo del usuario.
          </Typography>

          <Stack spacing={3}>
            {/* ============ AQUÍ EMPIEZA SECCIÓN MODO OSCURO ============ */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Modo oscuro</Typography>
                <Typography variant="body2" color="text.secondary">
                  Cambia la interfaz entre claro y oscuro.
                </Typography>
              </Box>
              {/* Switch ligado al tema global (oscuro/alternarModo). */}
              <Switch checked={oscuro} onChange={alternarModo} color="primary" />
            </Box>
            {/* ============ AQUÍ TERMINA SECCIÓN MODO OSCURO ============ */}

            <Divider />

            {/* ============ AQUÍ EMPIEZA SECCIÓN COLOR DEL MENÚ ============ */}
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Color del menú
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {/* Un botón por acento; el activo va resaltado. */}
                {LISTA_ACENTOS.map((item) => (
                  <Button
                    key={item.id}
                    variant={accentId === item.id ? 'contained' : 'outlined'}
                    onClick={() => elegirAcento(item.id)}
                    sx={{
                      minWidth: 140,
                      borderRadius: 2,
                      textTransform: 'none',
                      bgcolor: accentId === item.id ? item.main : 'transparent',
                      color: accentId === item.id ? item.contrastText : item.main,
                      borderColor: item.main,
                      '&:hover': {
                        bgcolor: accentId === item.id ? item.main : `${item.main}15`,
                      },
                    }}
                  >
                    {item.nombre}
                  </Button>
                ))}
              </Stack>
            </Box>
            {/* ============ AQUÍ TERMINA SECCIÓN COLOR DEL MENÚ ============ */}

            <Divider />

            {/* ============ AQUÍ EMPIEZA SECCIÓN TEMA ACTUAL ============ */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Tema actual</Typography>
                <Typography variant="body2" color="text.secondary">
                  {/* Etiqueta legible del modo + nombre del acento. */}
                  {mode === 'dark' ? 'Oscuro' : 'Claro'} · {ACCENTOS[accentId]?.nombre ?? accentId}
                </Typography>
              </Box>
              {/* Vuelve a los valores por defecto del tema. */}
              <Button variant="text" onClick={restablecer} sx={{ color: 'encabezado.main' }}>
                Restablecer
              </Button>
            </Box>
            {/* ============ AQUÍ TERMINA SECCIÓN TEMA ACTUAL ============ */}
          </Stack>
        </CardContent>
      </Card>
      {/* ============ AQUÍ TERMINA TARJETA CONFIGURACIÓN ============ */}
    </Box>
    // ============ AQUÍ TERMINA CONTENEDOR CONFIGURACIÓN ============
  );
}
// ============ AQUÍ TERMINA CONFIGURACIÓN ============

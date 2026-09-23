import { Box, Button, Card, CardContent, Divider, Stack, Switch, Typography } from '@mui/material';
import { useThemeMode } from '../Components/ThemeModeProvider.jsx';
import { ACCENTOS } from '../theme.js';

const LISTA_ACENTOS = Object.values(ACCENTOS);

export default function Configuracion() {
  const { mode, accentId, oscuro, alternarModo, elegirAcento, restablecer } = useThemeMode();

  return (
    <Box sx={{ p: 2, width: '100%' }}>
      <Card sx={{ maxWidth: 920, mx: 'auto', borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" fontWeight={800} color="encabezado.main" sx={{ mb: 1 }}>
            Configuración
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Personaliza la apariencia del sistema según el estilo del usuario.
          </Typography>

          <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Modo oscuro</Typography>
                <Typography variant="body2" color="text.secondary">
                  Cambia la interfaz entre claro y oscuro.
                </Typography>
              </Box>
              <Switch checked={oscuro} onChange={alternarModo} color="primary" />
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Color del menú
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
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

            <Divider />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>Tema actual</Typography>
                <Typography variant="body2" color="text.secondary">
                  {mode === 'dark' ? 'Oscuro' : 'Claro'} · {ACCENTOS[accentId]?.nombre ?? accentId}
                </Typography>
              </Box>
              <Button variant="text" onClick={restablecer} sx={{ color: 'encabezado.main' }}>
                Restablecer
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

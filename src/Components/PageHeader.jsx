// ============================================================================
// ARCHIVO: src/Components/PageHeader.jsx
// FUNCIÓN GENERAL: encabezado uniforme de página: título + subtítulo
//   opcional + botón de acción opcional a la derecha.
// FLUJO DE DATOS:
//   - ENTRAN: id, titulo, subtitulo, textoAccion y onAccion de la página padre.
//   - SALEN: layout visual; el botón delega a onAccion del padre.
// QUÉ MODIFICAR SI hay cambios: rama subtitulo (oculta si no hay) y rama
//   textoAccion (botón solo si hay texto); <Box> raíz conserva su id.
// ============================================================================
// Encabezado uniforme para las páginas: título, subtítulo y acción opcional.
// ============ AQUÍ EMPIEZA COMPONENTE PageHeader ============
import { Box, Typography, Button } from '@mui/material';

export default function PageHeader({ id, titulo, subtitulo, textoAccion, onAccion }) {
    return (
        <Box
            id={id ?? 'Encabezado de pagina'}
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
                mb: 2.5,
            }}
        >
            {/* ============ AQUÍ EMPIEZA TEXTOS (título+subtítulo) ============ */}
            {/* QUÉ HACE: columna de textos (título+subtítulo). SI agregas breadcrumb, ponerlo aquí arriba. */}
            <Box id="Box-PageHeader-Textos">
                {/* Título con token encabezado (legible en claro/oscuro y en acento blanco). */}
                <Typography variant="h4" color="encabezado.main" fontWeight="bold">
                    {titulo}
                </Typography>
                {subtitulo && (
                    <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                        {subtitulo}
                    </Typography>
                )}
            </Box>
            {/* ============ AQUÍ TERMINA TEXTOS (título+subtítulo) ============ */}
            {/* ============ AQUÍ EMPIEZA BOTÓN acción opcional ============ */}
            {textoAccion && (
                <Button variant="contained" color="primary" onClick={onAccion} sx={{ flexShrink: 0 }}>
                    {textoAccion}
                </Button>
            )}
            {/* ============ AQUÍ TERMINA BOTÓN acción opcional ============ */}
        </Box>
    );
}
// ============ AQUÍ TERMINA COMPONENTE PageHeader ============

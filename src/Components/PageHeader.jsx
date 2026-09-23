import { Box, Typography, Button } from '@mui/material';

// ============================================================================
// ARCHIVO: src/Components/PageHeader.jsx
// FUNCIÓN GENERAL: Encabezado uniforme de página: título + subtítulo opcional
//   + botón de acción opcional a la derecha. Usado en Plantillas, Revisión,
//   Seguimiento, GenerarCarta, etc.
// PROPS QUE RECIBE (datos provenientes de):
//   - id (string|undefined): id para el <Box> raíz. Lo manda la página padre;
//     si no llega, usa 'Encabezado de pagina' por defecto.
//   - titulo (string): título grande. Viene de la página (ej. "Revisar cartas").
//   - subtitulo (string|undefined): texto secundario debajo del título.
//   - textoAccion (string|undefined): si existe, pinta el <Button>. Viene de la página.
//   - onAccion (función|undefined): handler del botón. Lo ejecuta la página padre.
// QUÉ MANDA/RETORNA (datos que se mandan a otro archivo para procesamiento):
//   - Retorna layout visual. Al pulsar el botón, delega a `onAccion` de la
//     página padre (no procesa nada aquí).
// QUÉ MODIFICAR SI hay cambios:
//   - RAMA subtitulo: `{subtitulo && ...}` — QUÉ HACE: oculta la línea si no hay
//     subtítulo. SI siempre quieres subtítulo, vuelve obligatorio en el padre.
//   - RAMA textoAccion: `{textoAccion && <Button ...>}` — QUÉ HACE: botón solo
//     si hay texto. SI necesitas 2 botones, agregar props textoAccion2/onAccion2.
//   - <Box> raíz conserva `id={id ?? ...}` — NO renombrar; los tests buscan ese id.
// ============================================================================
// Encabezado uniforme para las páginas: título, subtítulo y acción opcional.
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
            {textoAccion && (
                <Button variant="contained" color="primary" onClick={onAccion} sx={{ flexShrink: 0 }}>
                    {textoAccion}
                </Button>
            )}
        </Box>
    );
}

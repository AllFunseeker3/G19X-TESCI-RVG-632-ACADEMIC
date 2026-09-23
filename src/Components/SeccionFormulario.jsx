import { Box, Typography } from '@mui/material';

// Contenedor con título y grid de N columnas.
// Reutilizable para agrupar campos en GenerarCarta u otras pestañas.
export default function SeccionFormulario({ titulo, columnas = 3, children }) {
    return (
        <Box sx={{ gridColumn: '1 / -1', border: '1px solid rgba(22,49,114,0.12)', borderRadius: 2, p: 2.5 }}>
            {titulo && (
                <Typography variant="subtitle1" fontWeight="bold" color="encabezado.main" sx={{ mb: 1.5 }}>
                    {titulo}
                </Typography>
            )}
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: `repeat(${columnas}, 1fr)` } }}>
                {children}
            </Box>
        </Box>
    );
}
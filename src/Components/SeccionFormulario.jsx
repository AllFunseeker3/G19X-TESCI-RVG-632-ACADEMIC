// ============================================================================
// ARCHIVO: src/Components/SeccionFormulario.jsx
// FUNCIÓN GENERAL: contenedor con título y grid de N columnas para agrupar
//   campos en GenerarCarta u otras pestañas.
// FLUJO DE DATOS:
//   - ENTRAN: titulo, columnas y children del padre.
//   - SALEN: layout visual; no emite datos.
// QUÉ MODIFICAR SI hay cambios: estilos del contenedor o grid, aquí mismo.
// ============================================================================
import { Box, Typography } from '@mui/material';

// ============ AQUÍ EMPIEZA COMPONENTE SeccionFormulario ============
// Contenedor con título y grid de N columnas.
// Reutilizable para agrupar campos en GenerarCarta u otras pestañas.
export default function SeccionFormulario({ titulo, columnas = 3, children }) {
    return (
        <Box sx={{ gridColumn: '1 / -1', border: '1px solid rgba(22,49,114,0.12)', borderRadius: 2, p: 2.5 }}>
            {/* ============ AQUÍ EMPIEZA TÍTULO de sección ============ */}
            {titulo && (
                <Typography variant="subtitle1" fontWeight="bold" color="encabezado.main" sx={{ mb: 1.5 }}>
                    {titulo}
                </Typography>
            )}
            {/* ============ AQUÍ TERMINA TÍTULO de sección ============ */}
            {/* ============ AQUÍ EMPIEZA GRID de campos ============ */}
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: `repeat(${columnas}, 1fr)` } }}>
                {children}
            </Box>
            {/* ============ AQUÍ TERMINA GRID de campos ============ */}
        </Box>
    );
}
// ============ AQUÍ TERMINA COMPONENTE SeccionFormulario ============
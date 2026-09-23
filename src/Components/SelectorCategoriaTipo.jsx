// ============================================================================
// ARCHIVO: src/Components/SelectorCategoriaTipo.jsx
// FUNCIÓN GENERAL: selectores de Categoría (Campo 1) + Tipo (Campo 2).
//   El Tipo se habilita solo tras elegir Categoría.
// FLUJO DE DATOS:
//   - ENTRAN: categoria, tipoDoc, categorias, tiposDisponibles, errores y
//     handlers del padre (GenerarCarta).
//   - SALEN: onCategoria/onTipo hacia el padre.
// QUÉ MODIFICAR SI hay cambios: opciones o validaciones, aquí mismo.
// ============================================================================
import { Box, NativeSelect, Typography } from '@mui/material';
import Etiqueta from './Etiqueta';

// ============ AQUÍ EMPIEZA COMPONENTE SelectorCategoriaTipo ============
// Selectores de Categoría (Campo 1) + Tipo (Campo 2).
// Reutilizable en GenerarCarta y en futuros filtros de Revisión/Seguimiento.
export default function SelectorCategoriaTipo({
    categoria,
    tipoDoc,
    categorias,
    tiposDisponibles,
    errores,
    onCategoria,
    onTipo,
}) {
    return (
        <Box sx={{
            display: 'grid',
            gap: 4,
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        }}>
            {/* ============ AQUÍ EMPIEZA SELECTOR Categoría ============ */}
            <Box sx={{ minWidth: 200 }}>
                <Etiqueta htmlFor="categoria-select" requerido>
                    Categoría del documento
                </Etiqueta>
                <NativeSelect
                    fullWidth
                    required
                    error={Boolean(errores.categoria)}
                    value={categoria}
                    onChange={onCategoria}
                    inputProps={{ name: 'Categoria', id: 'categoria-select' }}
                >
                    <option value="">Seleccione la categoría</option>
                    {categorias.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </NativeSelect>
                {errores.categoria && (
                    <Typography variant="caption" color="error">
                        {errores.categoria}
                    </Typography>
                )}
            </Box>
            {/* ============ AQUÍ TERMINA SELECTOR Categoría ============ */}

            {/* ============ AQUÍ EMPIEZA SELECTOR Tipo ============ */}
            <Box sx={{ minWidth: 200, opacity: categoria === '' ? 0.5 : 1 }}>
                <Etiqueta htmlFor="tipo-select" requerido>
                    Tipo de documento
                </Etiqueta>
                <NativeSelect
                    fullWidth
                    required
                    error={Boolean(errores.tipoDoc)}
                    value={tipoDoc}
                    onChange={onTipo}
                    disabled={categoria === ''}
                    inputProps={{ name: 'TipoDocumento', id: 'tipo-select' }}
                >
                    <option value="">Seleccione el tipo</option>
                    {tiposDisponibles.map((t) => (
                        <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                </NativeSelect>
                {errores.tipoDoc && (
                    <Typography variant="caption" color="error">
                        {errores.tipoDoc}
                    </Typography>
                )}
            </Box>
            {/* ============ AQUÍ TERMINA SELECTOR Tipo ============ */}
        </Box>
    );
}
// ============ AQUÍ TERMINA COMPONENTE SelectorCategoriaTipo ============
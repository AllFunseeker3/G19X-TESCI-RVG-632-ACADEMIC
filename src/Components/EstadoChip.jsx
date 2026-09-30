// ============================================================================
// ARCHIVO: src/Components/EstadoChip.jsx
// FUNCIÓN GENERAL: estado jurídico/documental como <Chip> MUI con color
//   estandarizado. Acepta código API o etiqueta y pinta la etiqueta.
// FLUJO DE DATOS:
//   - ENTRAN: estado (código o etiqueta) desde Revisión, Seguimiento, Inicio.
//   - SALEN: <Chip> visual; color/etiqueta vía ../lib/estados.js.
// QUÉ MODIFICAR SI hay cambios: nuevo estado en ../lib/estados.js, NO aquí.
// NOTA: no lleva <Box>, por eso no se agregan ids Box aquí.
// ============================================================================
import { Chip } from '@mui/material';
import { COLOR_POR_ESTADO, estadoBonito, estadoCodigo } from '../lib/estados';

// ============ AQUÍ EMPIEZA COMPONENTE EstadoChip ============
// Chip de estado con los mismos colores que TablaGeneral.
export default function EstadoChip({ estado }) {
    const codigo = estadoCodigo(estado); // Normaliza etiqueta -> código API.
    const etiqueta = estadoBonito(estado); // Código o etiqueta -> etiqueta visible.
    return (
        <Chip
            label={etiqueta}
            color={COLOR_POR_ESTADO[codigo] ?? 'default'}
            sx={{ fontWeight: 'bold', color: 'white' }}
        />
    );
}
// ============ AQUÍ TERMINA COMPONENTE EstadoChip ============

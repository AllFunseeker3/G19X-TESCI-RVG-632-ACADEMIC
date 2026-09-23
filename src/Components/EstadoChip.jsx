import { Chip } from '@mui/material';
import { COLOR_POR_ESTADO, estadoBonito, estadoCodigo } from '../lib/estados';

// ============================================================================
// ARCHIVO: src/Components/EstadoChip.jsx
// FUNCIÓN GENERAL: Muestra el estado jurídico/documental como <Chip> de MUI
//   con color estandarizado. Acepta código API ('por_revisar') o etiqueta
//   ('Por revisar') y siempre pinta la etiqueta.
// PROPS QUE RECIBE (datos provenientes de):
//   - estado (string): código o etiqueta. Viene de Revisión.jsx, Seguimiento,
//     Inicio (TablaGeneral) y en general cualquier fila de documentos.
// QUÉ MANDA/RETORNA (datos que se mandan a otro archivo para procesamiento):
//   - Retorna un <Chip> visual. No manda datos ni eventos; el color/etiqueta
//     se resuelven con ../lib/estados.js (COLOR_POR_ESTADO/estadoBonito).
// QUÉ MODIFICAR SI hay cambios:
//   - Nuevo estado: añádelo en ../lib/estados.js (etiqueta + color), NO aquí.
// NOTA: no lleva <Box>, por eso no se agregan ids Box aquí.
// ============================================================================
// Chip de estado con los mismos colores que TablaGeneral.
export default function EstadoChip({ estado }) {
    const codigo = estadoCodigo(estado);
    const etiqueta = estadoBonito(estado);
    return (
        <Chip
            label={etiqueta}
            color={COLOR_POR_ESTADO[codigo] ?? 'default'}
            sx={{ fontWeight: 'bold', color: codigo === 'borrador' ? undefined : 'white' }}
        />
    );
}

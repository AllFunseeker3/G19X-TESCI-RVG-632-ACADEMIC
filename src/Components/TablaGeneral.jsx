// ============================================================================
// ARCHIVO: src/Components/TablaGeneral.jsx
// FUNCIÓN GENERAL: Tabla de documentos (ID, Tipo, Cliente/Destino, Fecha,
//   Estado jurídico) usada en Inicio.jsx para el listado general.
// PROPS QUE RECIBE (datos provenientes de):
//   - datos (array): filas `{ id, tipo, cliente, fecha, estado }` con estado
//     en etiqueta visible ('Por revisar'...). Viene de Inicio.jsx (tablaDocs,
//     mapeado de GET /api/documentos con ../lib/estados.js).
// QUÉ MANDA/RETORNA (datos que se mandan a otro archivo para procesamiento):
//   - Retorna <Table> visual. No manda datos ni navega; solo pinta `datos`.
//     El color del <Chip> se calcula inline (no usa COLOR_POR_ESTADO).
// QUÉ MODIFICAR SI hay cambios:
//   - COLUMNAS <TableHead>: QUÉ HACEN: definen las 5 columnas fijas. SI agregas
//     un campo (ej. "Acciones"), agregar <TableCell> en Head Y en Body.
//   - RAMA color Chip: `Aprobado->success, Rechazado->error, resto->warning` —
//     QUÉ HACE: semáforo simple. SI agregas estados, unifica con
//     COLOR_POR_ESTADO de ../lib/estados.js como hace EstadoChip.jsx.
//   - PROP key={doc.id}: requiere ids únicos. SI hay duplicados, usar key compuesta.
// NOTA: no usa <Box>, por eso no se agregan ids Box aquí (solo comentarios).
// ============================================================================
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

export default function TablaGeneral({datos}) {
    return(
        <TableContainer component={Paper} sx={{borderRadius:2, boxShadow:3}}> 
            <Table sx={{ minWidth: 650 }}>
            {/* Encabezado con el acento elegido + contraste (legible en blanco/oscuro). */}
            <TableHead sx={{bgcolor:'primary.main'}}>
                <TableRow>
                    <TableCell sx={{color:'primary.contrastText',fontWeight:'bold'}}>ID</TableCell>
                    <TableCell sx={{color:'primary.contrastText',fontWeight:'bold'}}>Tipo de documento</TableCell>
                    <TableCell sx={{color:'primary.contrastText',fontWeight:'bold'}}>Cliente/Destino</TableCell>
                    <TableCell sx={{color:'primary.contrastText',fontWeight:'bold'}}>Fecha de creación</TableCell>
                    <TableCell sx={{color:'primary.contrastText',fontWeight:'bold'}}>Estado juridico</TableCell>
                </TableRow>
            </TableHead>
            
            <TableBody>
                {datos.map((doc) => (
                    <TableRow key={doc.id} hover>
                    <TableCell>{doc.id}</TableCell>
                    <TableCell>{doc.tipo}</TableCell>
                    <TableCell>{doc.cliente}</TableCell>
                    <TableCell>{doc.fecha}</TableCell>
                    <TableCell>
                        <Chip
                            label={doc.estado}
                            color={doc.estado === 'Aprobado' ? 'success' :
                            doc.estado === 'Rechazado' ? 'error' :
                            'warning'}
                        sx={{fontWeight:'bold', color:'white'}}
                    />
                    </TableCell>

                </TableRow>
            ))}

            </TableBody>
            </Table>
    </TableContainer>

    );
}
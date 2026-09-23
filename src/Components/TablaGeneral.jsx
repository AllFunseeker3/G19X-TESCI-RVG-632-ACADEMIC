// ============================================================================
// ARCHIVO: src/Components/TablaGeneral.jsx
// FUNCIÓN GENERAL: tabla de documentos (ID, Tipo, Cliente/Destino, Fecha,
//   Estado jurídico) usada en Inicio para el listado general.
// FLUJO DE DATOS:
//   - ENTRAN: datos (filas id, tipo, cliente, fecha, estado) desde Inicio
//     (mapeado de GET /api/documentos con ../lib/estados.js).
//   - SALEN: <Table> visual; color del <Chip> inline (no navega).
// QUÉ MODIFICAR SI hay cambios: columnas en <TableHead>/<TableBody>; si
//   agregas estados, unifica con COLOR_POR_ESTADO (ver EstadoChip.jsx).
// NOTA: no usa <Box>, por eso no se agregan ids Box aquí (solo comentarios).
// ============================================================================
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

// ============ AQUÍ EMPIEZA COMPONENTE TablaGeneral ============
export default function TablaGeneral({datos}) {
    return(
        <TableContainer component={Paper} sx={{borderRadius:2, boxShadow:3}}> 
            <Table sx={{ minWidth: 650 }}>
            {/* ============ AQUÍ EMPIEZA ENCABEZADO de tabla ============ */}
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
            {/* ============ AQUÍ TERMINA ENCABEZADO de tabla ============ */}
            
            {/* ============ AQUÍ EMPIEZA CUERPO de tabla ============ */}
            <TableBody>
                {datos.map((doc) => (
                    <TableRow key={doc.id} hover>
                    <TableCell>{doc.id}</TableCell>
                    <TableCell>{doc.tipo}</TableCell>
                    <TableCell>{doc.cliente}</TableCell>
                    <TableCell>{doc.fecha}</TableCell>
                    <TableCell>
                        {/* ============ AQUÍ EMPIEZA CHIP estado ============ */}
                        <Chip
                            label={doc.estado}
                            color={doc.estado === 'Aprobado' ? 'success' :
                            doc.estado === 'Rechazado' ? 'error' :
                            'warning'}
                        sx={{fontWeight:'bold', color:'white'}}
                    />
                        {/* ============ AQUÍ TERMINA CHIP estado ============ */}
                    </TableCell>

                </TableRow>
            ))}

            </TableBody>
            {/* ============ AQUÍ TERMINA CUERPO de tabla ============ */}
            </Table>
    </TableContainer>

    );
}
// ============ AQUÍ TERMINA COMPONENTE TablaGeneral ============
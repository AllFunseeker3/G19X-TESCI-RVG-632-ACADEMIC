/* ============================================================================
 * ARCHIVO: src/Pages/Revision.jsx
 * FUNCIÓN GENERAL: Bandeja de revisión (aprobar/rechazar) con datos REALES.
 *   - Tabs de filtro por estado (Todos/Por revisar/Aprobado/Rechazado).
 *   - Tabla desde GET /api/documentos (filtrada por área y permiso en el back).
 *   - Dialog de dictamen: trae el detalle (datos + historial) y persiste con
 *     PATCH /api/documentos/:id/estado (el back deja rastro en historial).
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE):
 *     -> ../lib/api.js: getDocumentos(), getDocumento(), cambiarEstado().
 *     -> ../lib/estados.js: estadoBonito()/estadoCodigo() (código<->etiqueta).
 *     -> Components/PermisosProvider.jsx: puede(categoria,'modificar') para
 *        habilitar Aprobar/Rechazar.
 *     -> app.jsx: monta esta página en "/Revision" dentro de DashBoardLayout.
 *   - SALEN (DATOS QUE SE MANDAN A <archivo> para procesamiento):
 *     -> ../Components/EstadoChip.jsx: estado para pintar el chip.
 *     -> ../Components/PageHeader.jsx: título/subtítulo del encabezado.
 *     -> Seguimiento.jsx: el dictamen + historial quedan en BD y se ven allá.
 * QUÉ MODIFICAR SI hay cambios:
 *   - FILTROS: etiquetas visibles; el código API se deriva con estadoCodigo().
 *   - Dictamen: usa cambiarEstado(); el responsable lo pone el back (token).
 * ========================================================================== */
import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, InputLabel, List, ListItem, ListItemText, Divider,
  Alert,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PageHeader from '../Components/PageHeader';
// DATOS QUE SE MANDAN A ../Components/EstadoChip.jsx para procesamiento: estado={...}.
import EstadoChip from '../Components/EstadoChip';
// DATOS PROVENIENTES DE ../lib/api.js: bandeja real (ya filtrada por área/permiso).
import { getDocumentos, getDocumento, cambiarEstado, eliminarDocumento, descargarPDF } from '../lib/api.js';
// Conversión código API <-> etiqueta visible (ver ../lib/estados.js).
import { estadoBonito } from '../lib/estados';
// PERMISOS: dictaminar exige 'modificar' en la categoría de la fila.
import { usePermisos } from '../Components/PermisosProvider';

// ============ AQUÍ EMPIEZA FILTROS REVISIÓN ============
// CONSTANTE: pestañas de filtro por estado (etiquetas visibles).
// QUÉ HACE: define los valores del Tabs y del filtro `visibles`.
// DÓNDE SE USA: sección id="Filtros por estado".
// QUÉ MODIFICAR SI: agregas un estado, añádelo aquí (y en ../lib/estados.js).
const FILTROS = ['Todos', 'Por revisar', 'Aprobado', 'Rechazado'];
// ============ AQUÍ TERMINA FILTROS REVISIÓN ============

// ============ AQUÍ EMPIEZA FORMATO VALOR ============
// QUÉ HACE: valor de un campo del documento para el resumen del Dialog.
// Objetos/arreglos/bools se aplanan a texto legible.
function formatoValor(v) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (Array.isArray(v)) {
    return v.length > 0
      ? v.map((x) => (typeof x === 'object' ? x.name ?? JSON.stringify(x) : String(x))).join(', ')
      : '—';
  }
  if (typeof v === 'object') return v.name ?? JSON.stringify(v);
  return String(v);
}
// ============ AQUÍ TERMINA FORMATO VALOR ============

// ============ AQUÍ EMPIEZA PÁGINA REVISIÓN ============
// QUÉ HACE: bandeja de revisión con dictamen persistente en BD.
// DÓNDE SE USA: ruta "/Revision" en app.jsx; enlazada desde Inicio.
export default function Revision() {
    // ============ AQUÍ EMPIEZA ESTADOS REVISIÓN ============
    // ESTADO: filtro activo del Tabs. DÓNDE SE USA: `visibles` y Tabs value/onChange.
    const [filtro, setFiltro] = useState('Todos');
    // ESTADO: documentos de la bandeja (GET /api/documentos, área+permiso del back).
    const [docs, setDocs] = useState([]);
    // ESTADO: carga inicial y errores de red (se muestran en Alert).
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    // ESTADO: detalle del documento seleccionado para el Dialog (null = cerrado).
    const [seleccionado, setSeleccionado] = useState(null);
    // ESTADO: comentario del revisor capturado en el Dialog.
    const [comentario, setComentario] = useState('');
    // ESTADO: error de validación del dictamen (rechazo sin comentario).
    const [errorDictamen, setErrorDictamen] = useState('');
    // ESTADO: visor PDF del supervisor (Blob autenticado -> iframe).
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfNombre, setPdfNombre] = useState('');
    const [pdfAbierto, setPdfAbierto] = useState(false);
    const [pdfCargando, setPdfCargando] = useState(false);
    const [pdfError, setPdfError] = useState('');
    // ESTADO: confirmación de borrado (Dialog propio; window.confirm se bloquea
    // en el navegador tras varios usos seguidos y ya no deja borrar).
    const [borrarCandidato, setBorrarCandidato] = useState(null);
    const [borrando, setBorrando] = useState(false);
    // PERMISOS: admin/super dictaminan; eliminar exige permiso por categoría.
    const { puede, admin, super: esSuper } = usePermisos();
    // ============ AQUÍ TERMINA ESTADOS REVISIÓN ============

    // ============ AQUÍ EMPIEZA CARGA BANDEJA ============
    // CARGA: bandeja completa al montar (el back ya filtra por área y permiso).
    const cargar = async () => {
        try {
            const filas = await getDocumentos();
            setDocs(Array.isArray(filas) ? filas : []);
            setError('');
        } catch (e) {
            setError(e.message);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let vivo = true;
        (async () => {
            try {
                const filas = await getDocumentos();
                if (vivo) {
                    setDocs(Array.isArray(filas) ? filas : []);
                    setError('');
                }
            } catch (e) {
                if (vivo) setError(e.message);
            } finally {
                if (vivo) setCargando(false);
            }
        })();
        return () => { vivo = false; };
    }, []);
    // ============ AQUÍ TERMINA CARGA BANDEJA ============

    // ============ AQUÍ EMPIEZA HANDLERS DICTAMEN ============
    // CÁLCULO: filas visibles según el filtro activo (etiqueta vs código API).
    const visibles = filtro === 'Todos'
        ? docs
        : docs.filter((d) => estadoBonito(d.estado) === filtro);

    // HANDLER: cierra el Dialog y limpia el comentario.
    // DÓNDE SE USA: onClose del Dialog y botón "Cerrar".
    const cerrarDialogo = () => {
        cerrarPDF();
        setSeleccionado(null);
        setComentario('');
        setErrorDictamen('');
    };

    // HANDLER: abre el Dialog trayendo detalle (datos + historial) de la BD.
    const abrirDialogo = async (doc) => {
        try {
            const det = await getDocumento(doc.id);
            setSeleccionado(det);
            setComentario('');
            setError('');
        } catch (e) {
            setError(e.message);
        }
    };

    // HANDLER: abre el visor PDF del supervisor (Blob autenticado -> iframe).
    // QUÉ HACE: descarga el adjunto con token y lo muestra en un Dialog con iframe.
    // DÓNDE SE USA: botón "Ver PDF" de la sección Documentos PDF del dictamen.
    const verPDF = async (nombre) => {
        if (!nombre || pdfCargando) return;
        setPdfError('');
        setPdfCargando(true);
        try {
            const blob = await descargarPDF(nombre);
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setPdfNombre(nombre);
            setPdfAbierto(true);
        } catch (e) {
            setPdfError(e.message || 'No se pudo abrir el PDF');
        } finally {
            setPdfCargando(false);
        }
    };

    // HANDLER: cierra el visor PDF y libera el Blob.
    const cerrarPDF = () => {
        setPdfAbierto(false);
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
        setPdfNombre('');
        setPdfError('');
    };

    // HANDLER: aplica el dictamen (persiste en BD + rastro en historial).
    // QUÉ HACE: PATCH estado y recarga la bandeja. El responsable lo pone el back.
    // Rechazar exige comentario con motivos (también lo valida el back con 400).
    // DÓNDE SE USA: botones Rechazar/Aprobar del Dialog (borrador/por_revisar + permiso).
    const dictaminar = async (nuevoEstado) => {
        if (!seleccionado) return;
        if (nuevoEstado === 'rechazado' && !comentario.trim()) {
            setErrorDictamen('El rechazo exige un comentario con los motivos');
            return;
        }
        setErrorDictamen('');
        try {
            await cambiarEstado(seleccionado.id_documento ?? seleccionado.id, nuevoEstado, comentario);
            cerrarDialogo();
            setCargando(true);
            await cargar();
        } catch (e) {
            setError(e.message);
        }
    };

    // HANDLER: borra el documento (admin o permiso eliminar en su categoría).
    // Usa Dialog propio en vez de window.confirm (el navegador lo suprime tras
    // varios diálogos seguidos y el 4to borrado ya no pedía confirmación).
    const borrar = async () => {
        if (!borrarCandidato || borrando) return;
        setBorrando(true);
        try {
            await eliminarDocumento(borrarCandidato.id);
            setBorrarCandidato(null);
            setCargando(true);
            await cargar();
        } catch (e) {
            setError(e.message);
        } finally {
            setBorrando(false);
        }
    };

    // CÁLCULO: ¿puede dictaminar esta fila? (borrador/por_revisar + admin/super/modificar).
    const puedeDictaminar = (doc) =>
        (doc.estado === 'por_revisar' || doc.estado === 'borrador')
        && (admin || esSuper || puede(doc.categoria, 'modificar'));
    // CÁLCULO: ¿puede borrar esta fila? (admin o eliminar en su categoría).
    const puedeBorrar = (doc) => admin || puede(doc.categoria, 'eliminar');
    // ============ AQUÍ TERMINA HANDLERS DICTAMEN ============

    return (
        // SECCIÓN JSX: contenedor raíz (id preexistente conservado).
        // ============ AQUÍ EMPIEZA CONTENEDOR REVISIÓN ============
        <Box id="Contenedor de revision" sx={{ p: 2, width: '100%' }}>
            {/* ============ AQUÍ EMPIEZA ENCABEZADO REVISIÓN ============ */}
            <PageHeader
                id="Encabezado de revision"
                titulo="Revisión de cartas"
                subtitulo="Selecciona el documento de la lista para proceder con su evaluación."
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* ============ AQUÍ TERMINA ENCABEZADO REVISIÓN ============ */}

            {/* ============ AQUÍ EMPIEZA FILTROS POR ESTADO (JSX) ============ */}
            {/* SECCIÓN JSX: tabs de filtro (id preexistente conservado). */}
            <Box id="Filtros por estado" sx={{ mb: 2 }}>
                <Tabs value={filtro} onChange={(_, v) => setFiltro(v)} variant="scrollable" scrollButtons="auto">
                    {FILTROS.map((f) => (
                        <Tab key={f} label={f} value={f} />
                    ))}
                </Tabs>
            </Box>
            {/* ============ AQUÍ TERMINA FILTROS POR ESTADO (JSX) ============ */}

            {/* ============ AQUÍ EMPIEZA TABLA BANDEJA ============ */}
            {/* SECCIÓN JSX: tabla de la bandeja (id preexistente conservado). */}
            <Box id="Tabla de documentos por revisar">
                <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
                    <Table sx={{ minWidth: 650 }}>
                        {/* Encabezado con el acento elegido + texto de contraste (legible en blanco/oscuro). */}
                        <TableHead sx={{ bgcolor: 'primary.main' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>ID</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Tipo de documento</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Cliente/Destino</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Creado por</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Fecha de creación</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Estado juridico</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Acción</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {cargando ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">Cargando...</TableCell>
                                </TableRow>
                            ) : (
                                visibles.map((doc) => (
                                <TableRow key={doc.id} hover>
                                    <TableCell>#{doc.id}</TableCell>
                                    <TableCell>{doc.tipo}</TableCell>
                                    <TableCell>{doc.cliente ?? '—'}</TableCell>
                                    <TableCell>{doc.creador ?? '—'}</TableCell>
                                    <TableCell>{String(doc.creado_en ?? '').slice(0, 10)}</TableCell>
                                    {/* DATOS QUE SE MANDAN A ../Components/EstadoChip.jsx para procesamiento. */}
                                    <TableCell><EstadoChip estado={doc.estado} /></TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<VisibilityIcon />}
                                            onClick={() => abrirDialogo(doc)}
                                        >
                                            Revisar
                                        </Button>
                                        {puedeBorrar(doc) && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            startIcon={<DeleteIcon />}
                                            onClick={() => setBorrarCandidato(doc)}
                                        >
                                            Borrar
                                        </Button>
                                        )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                                ))
                            )}
                            {!cargando && visibles.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        No hay documentos en este estado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
            {/* ============ AQUÍ TERMINA TABLA BANDEJA ============ */}

            {/* ============ AQUÍ EMPIEZA DIÁLOGO DICTAMEN ============ */}
            {/* SECCIÓN JSX: Dialog de dictamen (se abre con `seleccionado`). */}
            <Dialog open={Boolean(seleccionado)} onClose={cerrarDialogo} maxWidth="sm" fullWidth>
                {seleccionado && (
                    // SECCIÓN JSX: contenido del Dialog (id preexistente conservado).
                    <Box id="Dialogo de dictamen">
                        <DialogTitle color="encabezado.main" fontWeight="bold">
                            #{seleccionado.id_documento ?? seleccionado.id} — {seleccionado.tipo}
                        </DialogTitle>
                        <DialogContent dividers>
                            <Typography variant="subtitle2" color="text.secondary">
                                {seleccionado.cliente ?? '—'} · {String(seleccionado.creado_en ?? '').slice(0, 10)}
                                {seleccionado.folio ? ` · Folio: ${seleccionado.folio}` : ''}
                            </Typography>
                            {/* SECCIÓN JSX: chip del estado actual del seleccionado. */}
                            <Box id="Box-Revision-EstadoDialogo" sx={{ my: 1 }}>
                                <EstadoChip estado={seleccionado.estado} />
                            </Box>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                                Datos capturados
                            </Typography>
                            <List dense>
                                {Object.entries(seleccionado.datos ?? {}).map(([k, v]) => (
                                    <ListItem key={k} disablePadding sx={{ py: 0.5 }}>
                                        <ListItemText primary={k} secondary={formatoValor(v)} />
                                    </ListItem>
                                ))}
                            </List>
                            {/* SECCIÓN JSX: PDFs del documento (visor para supervisores). */}
                            <Box id="Box-Revision-PDFs" sx={{ mt: 2 }}>
                                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                                    Documentos PDF
                                </Typography>
                                {(!seleccionado.adjuntos || seleccionado.adjuntos.length === 0) ? (
                                    <Typography variant="body2" color="text.secondary">
                                        Sin PDF generado para este documento.
                                    </Typography>
                                ) : (
                                    <List dense>
                                        {seleccionado.adjuntos.map((a) => (
                                            <ListItem key={a.id} disablePadding sx={{ py: 0.5 }}>
                                                <ListItemText
                                                    primary={a.nombre_archivo}
                                                    secondary={a.subido_en ? String(a.subido_en).slice(0, 16).replace('T', ' ') : ''}
                                                />
                                                {(admin || esSuper || puedeDictaminar(seleccionado)) && (
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<PictureAsPdfIcon />}
                                                        disabled={pdfCargando}
                                                        onClick={() => verPDF(a.nombre_archivo)}
                                                        sx={{ ml: 1, flexShrink: 0 }}
                                                    >
                                                        {pdfCargando ? 'Abriendo…' : 'Ver PDF'}
                                                    </Button>
                                                )}
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                                {pdfError && (
                                    <Alert severity="error" sx={{ mt: 1 }} onClose={() => setPdfError('')}>
                                        {pdfError}
                                    </Alert>
                                )}
                            </Box>
                            {/* SECCIÓN JSX: captura del comentario del revisor (obligatorio al rechazar). */}
                            <Box id="Box-Revision-Comentario" sx={{ mt: 2 }}>
                                <InputLabel
                                    shrink
                                    htmlFor="comentario-revision"
                                    sx={{ position: 'static', transform: 'none', fontSize: '0.75rem', display: 'block', mb: 0.5 }}
                                >
                                    Comentario del revisor {puedeDictaminar(seleccionado) ? '(obligatorio para rechazar)' : ''}
                                </InputLabel>
                                <TextField
                                    id="comentario-revision"
                                    fullWidth
                                    variant="standard"
                                    multiline
                                    rows={3}
                                    required
                                    placeholder="Escribe observaciones, correcciones o el motivo del dictamen…"
                                    value={comentario}
                                    onChange={(e) => setComentario(e.target.value)}
                                />
                                {errorDictamen && (
                                    <Alert severity="error" sx={{ mt: 1 }}>{errorDictamen}</Alert>
                                )}
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={cerrarDialogo} color="primary">
                                Cerrar
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                disabled={!puedeDictaminar(seleccionado) || !comentario.trim()}
                                title={!puedeDictaminar(seleccionado) ? 'Solo borrador/por revisar con permiso (admin/super/modificar)' : (!comentario.trim() ? 'Escribe el motivo del rechazo' : 'Rechazar')}
                                onClick={() => dictaminar('rechazado')}
                            >
                                Rechazar
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                disabled={!puedeDictaminar(seleccionado)}
                                title={puedeDictaminar(seleccionado) ? 'Aprobar' : 'Solo borrador/por revisar con permiso (admin/super/modificar)'}
                                onClick={() => dictaminar('aprobado')}
                            >
                                Aprobar
                            </Button>
                        </DialogActions>
                    </Box>
                )}
            </Dialog>
            {/* ============ AQUÍ TERMINA DIÁLOGO DICTAMEN ============ */}

            {/* ============ AQUÍ EMPIEZA VISOR PDF SUPERVISOR ============ */}
            {/* SECCIÓN JSX: Dialog modal bloqueante con el PDF (iframe 70vh). */}
            <Dialog open={pdfAbierto} onClose={cerrarPDF} maxWidth="lg" fullWidth>
                <DialogTitle color="encabezado.main" fontWeight="bold">
                    {pdfNombre || 'Documento PDF'}
                </DialogTitle>
                <DialogContent dividers>
                    {pdfUrl && (
                        <Box
                            component="iframe"
                            src={pdfUrl}
                            title={pdfNombre}
                            sx={{ width: '100%', height: '70vh', border: 'none' }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={cerrarPDF} color="primary">
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>
            {/* ============ AQUÍ TERMINA VISOR PDF SUPERVISOR ============ */}

            {/* ============ AQUÍ EMPIEZA CONFIRMACIÓN BORRADO ============ */}
            {/* SECCIÓN JSX: confirma el borrado sin window.confirm (no lo bloquea el navegador). */}
            <Dialog open={Boolean(borrarCandidato)} onClose={() => !borrando && setBorrarCandidato(null)} maxWidth="xs" fullWidth>
                <DialogTitle color="encabezado.main" fontWeight="bold">
                    Borrar documento
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2">
                        ¿Borrar el documento #{borrarCandidato?.id}
                        {borrarCandidato?.tipo ? ` (${borrarCandidato.tipo})` : ''}?
                        Esta acción no se puede deshacer.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBorrarCandidato(null)} disabled={borrando} color="primary">
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={borrar}
                        disabled={borrando}
                    >
                        {borrando ? 'Borrando…' : 'Borrar'}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* ============ AQUÍ TERMINA CONFIRMACIÓN BORRADO ============ */}
        </Box>
        // ============ AQUÍ TERMINA CONTENEDOR REVISIÓN ============
    );
}
// ============ AQUÍ TERMINA PÁGINA REVISIÓN ============

/* ============================================================================
 * ARCHIVO: src/Pages/Revision.jsx
 * FUNCIÓN GENERAL: Bandeja de revisión (aprobar/rechazar) con datos REALES.
 *   - Tabs de filtro por estado (Todos/En revisión/Aprobado/Rechazado).
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
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, InputLabel, List, ListItem, ListItemText, Divider,
  Alert, Chip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PageHeader from '../Components/PageHeader';
// DATOS QUE SE MANDAN A ../Components/EstadoChip.jsx para procesamiento: estado={...}.
import EstadoChip from '../Components/EstadoChip';
import ProgresoIA from '../Components/ProgresoIA';
// DATOS PROVENIENTES DE ../lib/api.js: bandeja real (ya filtrada por área/permiso).
import { getDocumentos, getDocumento, cambiarEstado, eliminarDocumento, descargarPDF, revisarPDFconIA } from '../lib/api.js';
// Conversión código API <-> etiqueta visible (ver ../lib/estados.js).
import { estadoBonito } from '../lib/estados';
import { categoriaDeTipo } from '../lib/tiposDocumentos';
// PERMISOS: dictaminar exige 'modificar' en la categoría de la fila.
import { usePermisos } from '../Components/PermisosProvider';

// ============ AQUÍ EMPIEZA FILTROS REVISIÓN ============
// CONSTANTE: pestañas de filtro por estado (etiquetas visibles).
// QUÉ HACE: define los valores del Tabs y del filtro `visibles`.
// DÓNDE SE USA: sección id="Filtros por estado".
// QUÉ MODIFICAR SI: agregas un estado, añádelo aquí (y en ../lib/estados.js).
// 'En revisión' filtra el código 'borrador' (estadoBonito lo mapea).
const FILTROS = ['Todos', 'En revisión', 'Aprobado', 'Rechazado'];
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
    // ============ AQUÍ EMPIEZA REVISIÓN PDF EXTERNO CON IA ============
    // Subir un PDF externo: la IA lo clasifica (11 tipos), extrae datos y revisa.
    const navigate = useNavigate();
    const [revAbierto, setRevAbierto] = useState(false);
    const [revArchivo, setRevArchivo] = useState(null);
    const [revCargando, setRevCargando] = useState(false);
    const [revError, setRevError] = useState('');
    const [revResultado, setRevResultado] = useState(null);
    const [revFases, setRevFases] = useState([]);
    const [revFase, setRevFase] = useState(0);
    const [revProgreso, setRevProgreso] = useState(0);
    const [revSegundos, setRevSegundos] = useState(0);
    const [revModelo, setRevModelo] = useState('');
    const revTimer = useRef(null);
    const FASES_REVISION_PDF = ['Conectando', 'Extrayendo texto del PDF', 'Clasificando tipo de carta', 'Extrayendo datos', 'Generando revisión jurídica'];
    const detenerProgresoRev = () => {
        if (revTimer.current) clearInterval(revTimer.current);
        revTimer.current = null;
    };
    const iniciarProgresoRev = (estimadoSeg = 90) => {
        detenerProgresoRev();
        setRevFases(FASES_REVISION_PDF);
        setRevFase(0);
        setRevProgreso(2);
        setRevSegundos(0);
        setRevModelo('');
        const t0 = Date.now();
        revTimer.current = setInterval(() => {
            const s = (Date.now() - t0) / 1000;
            setRevSegundos(Math.floor(s));
            setRevProgreso(Math.min(90, 2 + (s / estimadoSeg) * 88));
            setRevFase(Math.min(FASES_REVISION_PDF.length - 1, Math.floor((s / estimadoSeg) * FASES_REVISION_PDF.length)));
        }, 500);
    };
    useEffect(() => () => detenerProgresoRev(), []);
    const cerrarRevisionIA = () => {
        if (revCargando) return;
        detenerProgresoRev();
        setRevAbierto(false);
        setRevArchivo(null);
        setRevError('');
        setRevResultado(null);
        setRevProgreso(0);
        setRevFase(0);
    };
    const handleRevisarPDF = async () => {
        if (!revArchivo || revCargando) return;
        setRevError('');
        setRevResultado(null);
        setRevCargando(true);
        iniciarProgresoRev(90);
        try {
            const r = await revisarPDFconIA(revArchivo);
            setRevResultado(r);
            setRevModelo(r.modelo ?? '');
            setRevProgreso(100);
            setRevFase(FASES_REVISION_PDF.length - 1);
        } catch (e) {
            setRevError(e.message || 'No se pudo revisar el PDF');
        } finally {
            detenerProgresoRev();
            setRevCargando(false);
        }
    };
    // Editar = abrir GenerarCarta SIEMPRE como nueva, precargada con lo extraído.
    const handleEditarDesdeRevision = () => {
        if (!revResultado) return;
        try {
            sessionStorage.setItem('revision-pdf', JSON.stringify({
                id_tipo: revResultado.id_tipo,
                datos: revResultado.datos ?? {},
            }));
        } catch {
            /* sessionStorage no disponible */
        }
        const cat = categoriaDeTipo(revResultado.id_tipo);
        cerrarRevisionIA();
        navigate(`/Menu?origen=revision-pdf&categoria=${encodeURIComponent(cat)}&tipo=${encodeURIComponent(revResultado.id_tipo)}`);
    };
    // ============ AQUÍ TERMINA REVISIÓN PDF EXTERNO CON IA ============

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

            {/* ============ AQUÍ EMPIEZA REVISAR PDF EXTERNO (JSX) ============ */}
            <Box id="Box-Revision-IA-Externa" sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    startIcon={<UploadFileIcon />}
                    onClick={() => setRevAbierto(true)}
                >
                    Revisar documento
                </Button>
            </Box>
            {/* ============ AQUÍ TERMINA REVISAR PDF EXTERNO (JSX) ============ */}

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
                                {/* id_cliente es vínculo técnico (columna Cliente/Destino); no se lista. */}
                                {Object.entries(seleccionado.datos ?? {}).filter(([k]) => k !== 'id_cliente').map(([k, v]) => (
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
                                        {seleccionado.adjuntos.map((a, idx) => {
                                            // ADJ-01: el back ordena vigente primero; si falta el flag (API sin reiniciar), el primero es el actual.
                                            const esVigente = (a.vigente === undefined || a.vigente === null) ? idx === 0 : Boolean(Number(a.vigente));
                                            return (
                                            <ListItem key={a.id} disablePadding sx={{ py: 0.5 }}>
                                                <ListItemText
                                                    primary={a.nombre_archivo}
                                                    secondary={a.subido_en ? String(a.subido_en).slice(0, 16).replace('T', ' ') : ''}
                                                />
                                                <Chip size="small" label={esVigente ? 'Actual' : 'Versión anterior'} color={esVigente ? 'success' : 'default'} sx={{ mr: 1, flexShrink: 0 }} />
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
                                            );
                                        })}
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
                                title={!puedeDictaminar(seleccionado) ? 'Solo en revisión con permiso (admin/super/modificar)' : (!comentario.trim() ? 'Escribe el motivo del rechazo' : 'Rechazar')}
                                onClick={() => dictaminar('rechazado')}
                            >
                                Rechazar
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                disabled={!puedeDictaminar(seleccionado)}
                                title={puedeDictaminar(seleccionado) ? 'Aprobar' : 'Solo en revisión con permiso (admin/super/modificar)'}
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

            {/* ============ AQUÍ EMPIEZA DIÁLOGO REVISAR PDF CON IA ============ */}
            <Dialog open={revAbierto} onClose={cerrarRevisionIA} maxWidth="md" fullWidth>
                <DialogTitle color="encabezado.main" fontWeight="bold">
                    Revisar carta en PDF
                </DialogTitle>
                <DialogContent dividers>
                    {!revResultado && !revCargando && (
                        <Box id="Box-Revision-IA-Subida">
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Sube una carta en PDF de los 11 tipos. La IA la clasifica sola, extrae los datos y la revisa. Luego puedes generar una carta nueva con correcciones.
                            </Typography>
                            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                                {revArchivo ? revArchivo.name : 'Elegir PDF (solo .pdf, máx 10MB)'}
                                <input
                                    type="file"
                                    hidden
                                    accept="application/pdf,.pdf"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0] ?? null;
                                        setRevArchivo(f);
                                        setRevError('');
                                        e.target.value = '';
                                    }}
                                />
                            </Button>
                            {revError && (
                                <Alert severity="error" sx={{ mt: 2 }} onClose={() => setRevError('')}>
                                    {revError}
                                </Alert>
                            )}
                        </Box>
                    )}
                    {revCargando && (
                        <Box id="Box-Revision-IA-Progreso">
                            <ProgresoIA fases={revFases} indice={revFase} progreso={revProgreso} segundos={revSegundos} modelo={revModelo} />
                            <Typography variant="caption" color="text.secondary">
                                Conexión con la IA y procesamiento de la información recibida…
                            </Typography>
                        </Box>
                    )}
                    {revError && revResultado === null && revCargando === false && revArchivo && (
                        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setRevError('')}>
                            {revError}
                        </Alert>
                    )}
                    {revResultado && !revCargando && (
                        <Box id="Box-Revision-IA-Resultado">
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
                                <Chip label={`Tipo detectado: ${revResultado.nombre_tipo ?? revResultado.id_tipo}`} color="primary" />
                                <Chip label={`Confianza ${(Math.round((revResultado.confianza ?? 0) * 100))}%`} variant="outlined" />
                                <Chip
                                    label={revResultado.veredicto}
                                    color={revResultado.veredicto === 'APROBABLE' ? 'success' : revResultado.veredicto === 'RECHAZABLE' ? 'error' : 'warning'}
                                />
                            </Box>
                            {revResultado.veredicto === 'APROBABLE' ? (
                                <Alert severity="success" sx={{ mb: 2 }}>
                                    {revResultado.mensaje || 'La redacción original está bien.'} Puedes cerrar o editar los datos para generar una carta nueva.
                                </Alert>
                            ) : (
                                <Alert severity={revResultado.veredicto === 'RECHAZABLE' ? 'error' : 'warning'} sx={{ mb: 2 }}>
                                    {revResultado.mensaje || 'La IA encontró observaciones.'}
                                </Alert>
                            )}
                            {(revResultado.hallazgos ?? []).length > 0 && (
                                <>
                                    <Typography variant="subtitle2" fontWeight="bold">Hallazgos de la IA</Typography>
                                    <List dense>
                                        {(revResultado.hallazgos ?? []).map((h, i) => (
                                            <ListItem key={i} disablePadding sx={{ py: 0.25 }}>
                                                <ListItemText primary={`• ${h}`} />
                                            </ListItem>
                                        ))}
                                    </List>
                                    <Divider sx={{ my: 1 }} />
                                </>
                            )}
                            <Typography variant="subtitle2" fontWeight="bold">Datos extraídos (editables en GenerarCarta)</Typography>
                            <List dense>
                                {Object.entries(revResultado.datos ?? {}).map(([k, v]) => (
                                    <ListItem key={k} disablePadding sx={{ py: 0.25 }}>
                                        <ListItemText primary={k} secondary={formatoValor(v)} />
                                    </ListItem>
                                ))}
                                {Object.keys(revResultado.datos ?? {}).length === 0 && (
                                    <ListItem disablePadding><ListItemText primary="Sin datos extraídos" /></ListItem>
                                )}
                            </List>
                            {revModelo && (
                                <Typography variant="caption" color="text.secondary">Modelo: {revModelo}</Typography>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={cerrarRevisionIA} disabled={revCargando} color="primary">
                        {revResultado ? 'Cerrar' : 'Cancelar'}
                    </Button>
                    {!revResultado && (
                        <Button
                            variant="contained"
                            disabled={!revArchivo || revCargando}
                            onClick={handleRevisarPDF}
                        >
                            {revCargando ? 'Revisando…' : 'Revisar'}
                        </Button>
                    )}
                    {revResultado && !revCargando && (
                        <Button variant="contained" onClick={handleEditarDesdeRevision}>
                            {revResultado.veredicto === 'APROBABLE' ? 'Editar' : 'Editar y generar nueva'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
            {/* ============ AQUÍ TERMINA DIÁLOGO REVISAR PDF CON IA ============ */}
        </Box>
        // ============ AQUÍ TERMINA CONTENEDOR REVISIÓN ============
    );
}
// ============ AQUÍ TERMINA PÁGINA REVISIÓN ============

/* ============================================================================
 * ARCHIVO: src/Pages/Seguimiento.jsx
 * FUNCIÓN GENERAL: Trazabilidad del documento (línea de tiempo vertical) REAL.
 *   - Selector con GET /api/documentos (área y permiso del back).
 *   - Ficha del documento + stepper con GET /api/documentos/:id (historial
 *     con responsable, persistido por Revisión al dictaminar).
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE):
 *     -> ../lib/api.js: getDocumentos() y getDocumento() (server/.../documentos.js).
 *     -> ../lib/estados.js: estadoBonito() para etapas del historial.
 *     -> app.jsx: monta esta página en "/Seguimiento" dentro de DashBoardLayout.
 *     -> Revision.jsx (flujo lógico): sus dictámenes alimentan el historial.
 *     -> Inicio.jsx: links "Ver trazabilidad completa" y el buscador navegan aquí.
 *   - SALEN (DATOS QUE SE MANDAN A <archivo> para procesamiento):
 *     -> ../Components/EstadoChip.jsx: estado={doc.estado} para el chip.
 *     -> ../Components/PageHeader.jsx: título/subtítulo del encabezado.
 * QUÉ MODIFICAR SI hay cambios:
 *   - Selección por URL: usa useSearchParams en vez de useState idDoc.
 *   - Estilos: ids "Box-Seguimiento-*" (preexistentes conservados).
 * ========================================================================== */
import { useEffect, useState } from 'react';
import {
  Box, Typography, NativeSelect, InputLabel, Card, CardContent,
  Grid, Stepper, Step, StepLabel, StepContent, Alert,
} from '@mui/material';
import PageHeader from '../Components/PageHeader';
// DATOS QUE SE MANDAN A ../Components/EstadoChip.jsx para procesamiento: estado={doc.estado}.
import EstadoChip from '../Components/EstadoChip';
// DATOS PROVENIENTES DE ../lib/api.js: lista y detalle reales (área/permiso del back).
import { getDocumentos, getDocumento } from '../lib/api.js';
// Etiquetas legibles de etapas (código API -> visible).
import { estadoBonito } from '../lib/estados';

// QUÉ HACE: página de trazabilidad con selector + ficha + línea de tiempo.
// DÓNDE SE USA: ruta "/Seguimiento" en app.jsx; enlazada desde Inicio.
export default function Seguimiento() {
    // ESTADO: lista para el selector (GET /api/documentos).
    const [docs, setDocs] = useState([]);
    // ESTADO: id del documento seleccionado en el NativeSelect.
    const [idDoc, setIdDoc] = useState('');
    // ESTADO: detalle con historial (GET /api/documentos/:id).
    const [doc, setDoc] = useState(null);
    // ESTADO: carga y errores de red (se muestran en Alert).
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    // CARGA: lista al montar; preselecciona el primero.
    useEffect(() => {
        let vivo = true;
        (async () => {
            try {
                const filas = await getDocumentos();
                if (!vivo) return;
                const lista = Array.isArray(filas) ? filas : [];
                setDocs(lista);
                setError('');
                if (lista.length > 0) setIdDoc((prev) => prev || String(lista[0].id));
            } catch (e) {
                if (vivo) setError(e.message);
            } finally {
                if (vivo) setCargando(false);
            }
        })();
        return () => { vivo = false; };
    }, []);

    // CARGA: detalle + historial cada vez que cambia la selección.
    // Sin selección no hay nada que pedir (doc inicia en null).
    useEffect(() => {
        if (!idDoc) return;
        let vivo = true;
        (async () => {
            try {
                const det = await getDocumento(idDoc);
                if (vivo) {
                    setDoc(det);
                    setError('');
                }
            } catch (e) {
                if (vivo) setError(e.message);
            }
        })();
        return () => { vivo = false; };
    }, [idDoc]);

    const historial = Array.isArray(doc?.historial) ? doc.historial : [];

    return (
        // SECCIÓN JSX: contenedor raíz (id preexistente conservado).
        <Box id="Contenedor de seguimiento" sx={{ p: 2, width: '100%' }}>
            <PageHeader
                id="Encabezado de seguimiento"
                titulo="Seguimiento de documentos"
                subtitulo="Consulta la trazabilidad completa de cada documento: etapas, responsables y comentarios."
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* SECCIÓN JSX: selector del documento a consultar (id preexistente conservado). */}
            <Box id="Selector de documento" sx={{ maxWidth: 400, mb: 3 }}>
                <InputLabel
                    shrink
                    htmlFor="seguimiento-select"
                    sx={{ position: 'static', transform: 'none', fontSize: '0.75rem', display: 'block', mb: 0.5 }}
                >
                    Documento a consultar
                </InputLabel>
                <NativeSelect
                    fullWidth
                    value={idDoc}
                    onChange={(e) => setIdDoc(e.target.value)}
                    inputProps={{ name: 'Documento', id: 'seguimiento-select' }}
                >
                    {cargando && <option value="">Cargando...</option>}
                    {!cargando && docs.length === 0 && (
                        <option value="">Sin documentos</option>
                    )}
                    {docs.map((d) => (
                        <option key={d.id} value={d.id}>
                            #{d.id} — {d.tipo}
                        </option>
                    ))}
                </NativeSelect>
            </Box>

            {doc && (
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    {/* SECCIÓN JSX: ficha resumen del documento (id preexistente conservado). */}
                    <Box id="Ficha del documento">
                        <Card sx={{ borderRadius: 2 }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight="bold" color="encabezado.main">
                                    #{doc.id_documento ?? doc.id} — {doc.tipo}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Cliente: {doc.cliente ?? '—'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Creado: {String(doc.creado_en ?? '').slice(0, 10)}
                                </Typography>
                                {/* SECCIÓN JSX: chip de estado (id nuevo descriptivo). */}
                                <Box id="Box-Seguimiento-Estado" sx={{ mt: 2 }}>
                                    <EstadoChip estado={doc.estado} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                    {/* SECCIÓN JSX: línea de tiempo del historial (id preexistente conservado). */}
                    <Box id="Linea de tiempo del documento">
                        <Card sx={{ borderRadius: 2 }}>
                            <CardContent>
                                <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                                    Historial de trazabilidad
                                </Typography>
                                {historial.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary">
                                        Sin movimientos registrados.
                                    </Typography>
                                ) : (
                                <Stepper orientation="vertical">
                                    {historial.map((h, i) => (
                                        <Step key={h.id_historial ?? i} active completed={i < historial.length - 1}>
                                            <StepLabel>
                                                <Typography fontWeight="bold">
                                                    {estadoBonito(h.estado_nuevo)} · {String(h.creado_en ?? h.fecha ?? '').slice(0, 16).replace('T', ' ')}
                                                </Typography>
                                            </StepLabel>
                                            <StepContent>
                                                <Typography variant="body2">
                                                    <strong>Responsable:</strong> {h.responsable ?? '—'}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {h.comentario ?? ''}
                                                </Typography>
                                            </StepContent>
                                        </Step>
                                    ))}
                                </Stepper>
                                )}
                            </CardContent>
                        </Card>
                    </Box>
                </Grid>
            </Grid>
            )}
        </Box>
    );
}

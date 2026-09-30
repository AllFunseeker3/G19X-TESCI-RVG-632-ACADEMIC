/* ============================================================================
 * ARCHIVO: src/Pages/Clientes.jsx
 * FUNCIÓN GENERAL: directorio de clientes (personas/empresas) con verificación.
 *   - Tabs Todos/Pendientes (pendientes = sin verificar, visible a admin/super).
 *   - Alta/edición de cualquiera con escritura; lo de no-privilegiados nace
 *     pendiente (chip + botón Verificar para admin/super).
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE): ../lib/api.js (getClientes, crearCliente,
 *     actualizarCliente, verificarCliente, bajaCliente -> server/routes/clientes.js).
 *   - SALEN: id de cliente hacia GenerarCarta.jsx (autocomplete ?cliente=).
 *   - app.jsx: monta esta página en "/Clientes" dentro de DashBoardLayout.
 * QUÉ MODIFICAR SI hay cambios: columnas de la tabla o campos del diálogo,
 *   aquí mismo (los tipos persona/empresa cambian los campos visibles).
 * ========================================================================== */
import { useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, NativeSelect, InputLabel, Chip, Alert,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VerifiedIcon from '@mui/icons-material/Verified';
import PendingIcon from '@mui/icons-material/Pending';
import PageHeader from '../Components/PageHeader';
import Etiqueta from '../Components/Etiqueta';
import { getClientes, crearCliente, actualizarCliente, verificarCliente, bajaCliente } from '../lib/api.js';
import { usePermisos } from '../Components/PermisosProvider';

// ============ AQUÍ EMPIEZA FORM VACÍO ============
// Campos del diálogo (tipo define persona/empresa).
const FORM_VACIO = {
  tipo_cliente: 'moral', nombre: '', rfc: '', curp: '',
  domicilio: '', correo: '', telefono: '',
};
// ============ AQUÍ TERMINA FORM VACÍO ============

// ============ AQUÍ EMPIEZA PÁGINA CLIENTES ============
// QUÉ HACE: directorio con verificación por admin/super.
// DÓNDE SE USA: ruta "/Clientes" en app.jsx + menú lateral.
export default function Clientes() {
    // ============ AQUÍ EMPIEZA ESTADOS CLIENTES ============
    const [filtro, setFiltro] = useState('Todos');
    const [filas, setFilas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [exito, setExito] = useState('');
    const [dialogo, setDialogo] = useState(null); // null | { id? } (alta o edición)
    const [form, setForm] = useState(FORM_VACIO);
    const [errorForm, setErrorForm] = useState('');
    const [guardandoForm, setGuardandoForm] = useState(false);
    const [bajaCandidato, setBajaCandidato] = useState(null);
    const [dandoBaja, setDandoBaja] = useState(false);
    const { admin, super: esSuper } = usePermisos();
    const privilegiado = admin || esSuper;
    // ============ AQUÍ TERMINA ESTADOS CLIENTES ============

    // ============ AQUÍ EMPIEZA CARGA LISTA ============
    const cargar = async (soloPend = filtro === 'Pendientes') => {
        try {
            const lista = await getClientes(soloPend);
            setFilas(Array.isArray(lista) ? lista : []);
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
                const lista = await getClientes(false);
                if (vivo) {
                    setFilas(Array.isArray(lista) ? lista : []);
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
    // ============ AQUÍ TERMINA CARGA LISTA ============

    // ============ AQUÍ EMPIEZA HANDLERS ALTA/EDICIÓN ============
    const cambiarFiltro = (_, v) => {
        setFiltro(v);
        setCargando(true);
        cargar(v === 'Pendientes');
    };    const abrirAlta = () => {
        setForm(FORM_VACIO);
        setErrorForm('');
        setDialogo({});
    };

    const abrirEdicion = (c) => {
        setForm({
            tipo_cliente: c.tipo_cliente ?? 'moral',
            nombre: c.nombre ?? '', rfc: c.rfc ?? '', curp: c.curp ?? '',
            domicilio: c.domicilio ?? '',
            correo: c.correo ?? '', telefono: c.telefono ?? '',
        });
        setErrorForm('');
        setDialogo({ id: c.id });
    };

    const poner = (k) => (e) => {
        setForm((prev) => ({ ...prev, [k]: e.target.value }));
        if (errorForm) setErrorForm('');
    };

    const guardar = async () => {
        if (!form.nombre.trim()) {
            setErrorForm('El nombre es obligatorio');
            return;
        }
        setGuardandoForm(true);
        try {
            if (dialogo?.id) {
                await actualizarCliente(dialogo.id, form);
                setExito(`Cliente #${dialogo.id} actualizado`);
            } else {
                const r = await crearCliente(form);
                setExito(r?.verificado
                    ? `Cliente #${r.id} dado de alta (verificado)`
                    : `Cliente #${r.id} dado de alta (pendiente de verificación)`);
            }
            setDialogo(null);
            setCargando(true);
            await cargar();
        } catch (e) {
            setErrorForm(e.message);
        } finally {
            setGuardandoForm(false);
        }
    };

    const verificar = async (c, valor) => {
        try {
            await verificarCliente(c.id, valor);
            setExito(valor ? `Cliente #${c.id} verificado` : `Cliente #${c.id} regresó a pendiente`);
            setCargando(true);
            await cargar();
        } catch (e) {
            setError(e.message);
        }
    };

    const darBaja = async () => {
        if (!bajaCandidato || dandoBaja) return;
        setDandoBaja(true);
        try {
            await bajaCliente(bajaCandidato.id);
            setBajaCandidato(null);
            setExito(`Cliente #${bajaCandidato.id} dado de baja`);
            setCargando(true);
            await cargar();
        } catch (e) {
            setError(e.message);
        } finally {
            setDandoBaja(false);
        }
    };
    // ============ AQUÍ TERMINA HANDLERS ALTA/EDICIÓN ============

    const esPersona = form.tipo_cliente === 'fisica';

    return (
        // ============ AQUÍ EMPIEZA CONTENEDOR CLIENTES ============
        <Box id="Box-Clientes-Contenedor" sx={{ p: 2, width: '100%' }}>
            <PageHeader
                id="Box-Clientes-Encabezado"
                titulo="Clientes"
                subtitulo="Personas y empresas para autocompletar las cartas. Lo que das de alta sin ser admin/super queda pendiente de verificación."
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}
            {exito && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setExito('')}>
                    {exito}
                </Alert>
            )}

            {/* ============ AQUÍ EMPIEZA FILTROS Y ALTA ============ */}
            <Box id="Box-Clientes-Filtros" sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <Tabs value={filtro} onChange={cambiarFiltro}>
                    <Tab label="Todos" value="Todos" />
                    {privilegiado && <Tab label="Pendientes" value="Pendientes" />}
                </Tabs>
                <Button variant="contained" color="primary" onClick={abrirAlta} sx={{ ml: 'auto' }}>
                    Nuevo cliente
                </Button>
            </Box>
            {/* ============ AQUÍ TERMINA FILTROS Y ALTA ============ */}

            {/* ============ AQUÍ EMPIEZA TABLA CLIENTES ============ */}
            <Box id="Box-Clientes-Tabla">
                <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead sx={{ bgcolor: 'primary.main' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>ID</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Nombre / Razón social</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Tipo</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>RFC / CURP</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Teléfono</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Verificación</TableCell>
                                <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Acción</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {cargando ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">Cargando...</TableCell>
                                </TableRow>
                            ) : (
                                filas.map((c) => (
                                <TableRow key={c.id} hover>
                                    <TableCell>#{c.id}</TableCell>
                                    <TableCell>{c.nombre}</TableCell>
                                    <TableCell>{c.tipo_cliente === 'fisica' ? 'Persona' : 'Empresa'}</TableCell>
                                    <TableCell>{c.tipo_cliente === 'fisica' ? (c.curp ?? '—') : (c.rfc ?? '—')}</TableCell>
                                    <TableCell>{c.telefono ?? '—'}</TableCell>
                                    <TableCell>
                                        {c.verificado ? (
                                            <Chip icon={<VerifiedIcon />} label="Verificado" color="success" size="small" />
                                        ) : (
                                            <Chip icon={<PendingIcon />} label="Pendiente" color="warning" size="small" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {privilegiado && !c.verificado && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="success"
                                                startIcon={<VisibilityIcon />}
                                                onClick={() => verificar(c, true)}
                                            >
                                                Verificar
                                            </Button>
                                        )}
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<EditIcon />}
                                            onClick={() => abrirEdicion(c)}
                                        >
                                            Editar
                                        </Button>
                                        {privilegiado && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                startIcon={<DeleteIcon />}
                                                onClick={() => setBajaCandidato(c)}
                                            >
                                                Baja
                                            </Button>
                                        )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                                ))
                            )}
                            {!cargando && filas.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        {filtro === 'Pendientes' ? 'Sin pendientes de verificación.' : 'Sin clientes dados de alta.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
            {/* ============ AQUÍ TERMINA TABLA CLIENTES ============ */}

            {/* ============ AQUÍ EMPIEZA DIÁLOGO ALTA/EDICIÓN ============ */}
            <Dialog open={Boolean(dialogo)} onClose={() => !guardandoForm && setDialogo(null)} maxWidth="sm" fullWidth>
                <DialogTitle color="encabezado.main" fontWeight="bold">
                    {dialogo?.id ? `Editar cliente #${dialogo.id}` : 'Nuevo cliente'}
                </DialogTitle>
                <DialogContent dividers>
                    <InputLabel shrink sx={{ position: 'static', transform: 'none', fontSize: '0.75rem', display: 'block', mb: 0.5 }}>
                        Tipo de cliente
                    </InputLabel>
                    <NativeSelect fullWidth value={form.tipo_cliente} onChange={poner('tipo_cliente')} sx={{ mb: 2 }}>
                        <option value="moral">Empresa (persona moral)</option>
                        <option value="fisica">Persona (persona física)</option>
                    </NativeSelect>
                    <Etiqueta>{esPersona ? 'Nombre completo' : 'Razón social'}</Etiqueta>
                    <TextField fullWidth variant="standard" value={form.nombre} onChange={poner('nombre')} sx={{ mb: 2 }} />
                    {esPersona ? (
                        <>
                            <Etiqueta>CURP</Etiqueta>
                            <TextField fullWidth variant="standard" value={form.curp} onChange={poner('curp')} sx={{ mb: 2 }} />
                        </>
                    ) : (
                        <>
                            <Etiqueta>RFC</Etiqueta>
                            <TextField fullWidth variant="standard" value={form.rfc} onChange={poner('rfc')} sx={{ mb: 2 }} />
                        </>
                    )}
                    <Etiqueta>Domicilio</Etiqueta>
                    <TextField fullWidth variant="standard" value={form.domicilio} onChange={poner('domicilio')} sx={{ mb: 2 }} />
                    <Etiqueta>Correo</Etiqueta>
                    <TextField fullWidth variant="standard" value={form.correo} onChange={poner('correo')} sx={{ mb: 2 }} />
                    <Etiqueta>Teléfono</Etiqueta>
                    <TextField fullWidth variant="standard" value={form.telefono} onChange={poner('telefono')} />
                    {errorForm && (
                        <Alert severity="error" sx={{ mt: 2 }}>{errorForm}</Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogo(null)} disabled={guardandoForm} color="primary">
                        Cancelar
                    </Button>
                    <Button variant="contained" color="primary" onClick={guardar} disabled={guardandoForm}>
                        {guardandoForm ? 'Guardando…' : 'Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* ============ AQUÍ TERMINA DIÁLOGO ALTA/EDICIÓN ============ */}

            {/* ============ AQUÍ EMPIEZA CONFIRMACIÓN BAJA ============ */}
            <Dialog open={Boolean(bajaCandidato)} onClose={() => !dandoBaja && setBajaCandidato(null)} maxWidth="xs" fullWidth>
                <DialogTitle color="encabezado.main" fontWeight="bold">
                    Dar de baja
                </DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2">
                        ¿Dar de baja al cliente #{bajaCandidato?.id} ({bajaCandidato?.nombre})?
                        Dejará de salir en el autocompletado.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBajaCandidato(null)} disabled={dandoBaja} color="primary">
                        Cancelar
                    </Button>
                    <Button variant="contained" color="error" onClick={darBaja} disabled={dandoBaja}>
                        {dandoBaja ? 'Procesando…' : 'Dar de baja'}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* ============ AQUÍ TERMINA CONFIRMACIÓN BAJA ============ */}
        </Box>
        // ============ AQUÍ TERMINA CONTENEDOR CLIENTES ============
    );
}
// ============ AQUÍ TERMINA PÁGINA CLIENTES ============

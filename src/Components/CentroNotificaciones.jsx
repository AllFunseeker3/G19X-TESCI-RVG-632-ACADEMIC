/* ============================================================================
 * ARCHIVO: src/Components/CentroNotificaciones.jsx
 * FUNCIÓN GENERAL: campana de notificaciones REALES (avisos de creación).
 *   - Badge con tus no leídas (oculto si es 0: la campana queda sola).
 *   - Al clic muestra tus últimas 10 (qué es, quién la creó, hace-cuánto).
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE): ../lib/api.js -> getNotificaciones()
 *     (server/routes/notificaciones.js; el back inserta una fila por
 *     super del área + admin en POST /api/documentos).
 *   - SALEN: links a /Revision (react-router). Si el servidor cae, api.js
 *     dispara el evento y app.jsx te lleva a /Ingreso.
 * QUÉ MODIFICAR SI hay cambios: cantidad a mostrar (MAX_LISTA), intervalo
 *   de refresco (CADA) o el destino de los links, aquí mismo.
 * ========================================================================== */
import { useCallback, useEffect, useState } from 'react';
import { Badge, Box, Divider, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { Link } from 'react-router-dom';
import { getNotificaciones, marcarNotificacionLeida, marcarTodasLeidas } from '../lib/api.js';

// Cuántas notificaciones se listan en el desplegado.
const MAX_LISTA = 10;
// Refresco del badge en segundo plano (ms).
const CADA = 30000;

// ============ AQUÍ EMPIEZA HACE-CUÁNTO ============
// QUÉ HACE: "hace 5 min", "hace 1 hora", "ayer", "hace 3 días" o fecha corta.
// Si el valor no parsea, devuelve '' (no rompe el menú).
function haceCuanto(valor) {
    const t = new Date(valor).getTime();
    if (Number.isNaN(t)) return '';
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return 'hace un momento';
    const m = Math.floor(s / 60);
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return h === 1 ? 'hace 1 hora' : `hace ${h} horas`;
    const d = Math.floor(h / 24);
    if (d < 2) return 'ayer';
    if (d < 7) return `hace ${d} días`;
    const f = new Date(t);
    const dd = String(f.getDate()).padStart(2, '0');
    const mm = String(f.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${f.getFullYear()}`;
}
// ============ AQUÍ TERMINA HACE-CUÁNTO ============

// ============ AQUÍ EMPIEZA COMPONENTE CentroNotificaciones ============
// QUÉ HACE: campana con badge real + menú de últimas notificaciones.
// DÓNDE SE USA: Components/DashboardLayout.jsx (AppBar, junto al usuario).
export default function CentroNotificaciones() {
    const [ancla, setAncla] = useState(null);
    const [avisos, setAvisos] = useState([]); // Últimas notificaciones
    const [total, setTotal] = useState(0); // No leídas (badge)
    const abierto = Boolean(ancla);

    // ============ AQUÍ EMPIEZA HANDLER cargar avisos ============
    // CARGA: mis notificaciones + conteo de no leídas. Silenciosa si falla.
    const cargar = useCallback(async () => {
        try {
            const r = await getNotificaciones(MAX_LISTA);
            setAvisos(Array.isArray(r.notificaciones) ? r.notificaciones : []);
            setTotal(Number(r.no_leidas ?? 0));
        } catch {
            /* sin conexión: app.jsx te lleva al login */
        }
    }, []);
    // ============ AQUÍ TERMINA HANDLER cargar avisos ============

    // ============ AQUÍ EMPIEZA EFFECT carga inicial + refresco ============
    // Al montar pide una vez para pintar el badge; luego refresca cada 30s.
    useEffect(() => {
        const t0 = setTimeout(cargar, 0);
        const t1 = setInterval(cargar, CADA);
        return () => { clearTimeout(t0); clearInterval(t1); };
    }, [cargar]);

    // Al abrir el menú refresca y marca todo como leído (apaga el badge).
    const abrir = async (e) => {
        setAncla(e.currentTarget);
        await cargar();
        try {
            await marcarTodasLeidas();
            setTotal(0);
            setAvisos((prev) => prev.map((a) => ({ ...a, leida: true })));
        } catch {
            /* si falla el marcado, el badge se corrige en el siguiente refresco */
        }
    };

    // Clic en un aviso: lo marca leído (sin bloquear la navegación).
    const tocarAviso = (id) => {
        setAncla(null);
        if (!id) return;
        marcarNotificacionLeida(id).catch(() => {});
        setAvisos((prev) => prev.map((a) => (a.id === id ? { ...a, leida: true } : a)));
    };
    // ============ AQUÍ TERMINA EFFECT carga inicial + refresco ============

    return (
        <>
            {/* ============ AQUÍ EMPIEZA CAMPANA + BADGE ============ */}
            <IconButton color="inherit" onClick={abrir} aria-label="Notificaciones">
                {/* Badge REAL: se oculta solo cuando no hay pendientes. */}
                <Badge badgeContent={total} color="error" invisible={total === 0}>
                    <NotificationsIcon />
                </Badge>
            </IconButton>
            {/* ============ AQUÍ TERMINA CAMPANA + BADGE ============ */}
            {/* ============ AQUÍ EMPIEZA MENÚ de notificaciones ============ */}
            <Menu anchorEl={ancla} open={abierto} onClose={() => setAncla(null)}>
                {/* ============ AQUÍ EMPIEZA ENCABEZADO del menú ============ */}
                {/* QUÉ HACE: encabezado fijo del menú con el total real. */}
                <Box id="Box-CentroNotificaciones-Encabezado" sx={{ px: 2, py: 1, minWidth: 300 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="encabezado.main">
                        Notificaciones
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {avisos.length === 0
                            ? 'Sin pendientes'
                            : `${avisos.length} aviso(s)`}
                    </Typography>
                </Box>
                <Divider />
                {/* ============ AQUÍ TERMINA ENCABEZADO del menú ============ */}
                {/* ============ AQUÍ EMPIEZA LISTA últimos avisos ============ */}
                {avisos.length === 0 && (
                    <MenuItem disabled>No tienes avisos pendientes</MenuItem>
                )}
                {/* CADA AVISO: qué es (título), quién lo creó (detalle) y hace-cuánto. */}
                {avisos.map((a) => (
                    <MenuItem
                        key={a.id}
                        component={Link}
                        to="/Revision"
                        onClick={() => tocarAviso(a.id)}
                        sx={{ whiteSpace: 'normal' }}
                    >
                        <Box id={`Box-CentroNotificaciones-Aviso-${a.id}`}>
                            <Typography variant="body2" fontWeight={a.leida ? 'normal' : 'bold'}>
                                {a.titulo}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {a.detalle}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {haceCuanto(a.creado_en)}
                            </Typography>
                        </Box>
                    </MenuItem>
                ))}
                {avisos.length > 0 && (
                    <Box id="Box-CentroNotificaciones-Acciones" sx={{ p: 1 }}>
                        <MenuItem
                            component={Link}
                            to="/Revision"
                            onClick={() => setAncla(null)}
                            sx={{ justifyContent: 'center', color: 'encabezado.main', fontWeight: 'bold' }}
                        >
                            Ver todas en Revisión
                        </MenuItem>
                    </Box>
                )}
                {/* ============ AQUÍ TERMINA LISTA últimos avisos ============ */}
            </Menu>
            {/* ============ AQUÍ TERMINA MENÚ de notificaciones ============ */}
        </>
    );
}
// ============ AQUÍ TERMINA COMPONENTE CentroNotificaciones ============

/* ============================================================================
 * ARCHIVO: src/Components/CentroNotificaciones.jsx
 * FUNCIÓN GENERAL: campana de notificaciones REALES (ya no es prueba).
 *   - Badge con el total por revisar (oculto si es 0: la campana queda sola).
 *   - Al clic muestra tus últimas 5 (id, tipo, folio, fecha) + ir a Revisión.
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE): ../lib/api.js -> getDocumentos()
 *     con { estado: 'por_revisar' } (server/routes/documentos.js, filtrado
 *     por tu área y rol). Se pide al montar y cada vez que abres el menú.
 *   - SALEN: links a /Revision (react-router). Si el servidor cae, api.js
 *     dispara el evento y app.jsx te lleva a /Ingreso.
 * QUÉ MODIFICAR SI hay cambios: cantidad a mostrar (slice), estados a incluir
 *   o el destino de los links, aquí mismo.
 * ========================================================================== */
import { useCallback, useEffect, useState } from 'react';
import { Badge, Box, Divider, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { Link } from 'react-router-dom';
import { getDocumentos } from '../lib/api.js';

// Cuántas notificaciones se listan en el desplegado.
const MAX_LISTA = 5;

// ============ AQUÍ EMPIEZA COMPONENTE CentroNotificaciones ============
// QUÉ HACE: campana con badge real + menú de últimas notificaciones.
// DÓNDE SE USA: Components/DashboardLayout.jsx (AppBar, junto al usuario).
export default function CentroNotificaciones() {
    const [ancla, setAncla] = useState(null);
    const [avisos, setAvisos] = useState([]); // Docs por revisar (últimos 5)
    const [total, setTotal] = useState(0); // Total por revisar (badge)
    const abierto = Boolean(ancla);

    // ============ AQUÍ EMPIEZA HANDLER cargar por revisar ============
    // CARGA: por revisar desde la BD. Silenciosa si falla (app.jsx redirige).
    const cargar = useCallback(async () => {
        try {
            const docs = await getDocumentos({ estado: 'por_revisar' });
            setTotal(docs.length);
            setAvisos(docs.slice(0, MAX_LISTA));
        } catch {
            /* sin conexión: app.jsx te lleva al login */
        }
    }, []);
    // ============ AQUÍ TERMINA HANDLER cargar por revisar ============

    // ============ AQUÍ EMPIEZA EFFECT carga inicial + abrir menú ============
    // Al montar pide una vez para pintar el badge (en timeout para no setear en el effect).
    useEffect(() => {
        const t = setTimeout(cargar, 0);
        return () => clearTimeout(t);
    }, [cargar]);

    // Al abrir el menú refresca para traer lo último.
    const abrir = (e) => {
        setAncla(e.currentTarget);
        cargar();
    };
    // ============ AQUÍ TERMINA EFFECT carga inicial + abrir menú ============

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
                        {total === 0
                            ? 'Sin pendientes'
                            : `${total} documento(s) por revisar`}
                    </Typography>
                </Box>
                <Divider />
                {/* ============ AQUÍ TERMINA ENCABEZADO del menú ============ */}
                {/* ============ AQUÍ EMPIEZA LISTA últimas 5 ============ */}
                {avisos.length === 0 && (
                    <MenuItem disabled>No tienes avisos pendientes</MenuItem>
                )}
                {/* ÚLTIMAS 5: cada una linkea a Revisión (mismo destino del inicio). */}
                {avisos.map((a) => (
                    <MenuItem
                        key={a.id}
                        component={Link}
                        to="/Revision"
                        onClick={() => setAncla(null)}
                        sx={{ whiteSpace: 'normal' }}
                    >
                        <Box id={`Box-CentroNotificaciones-Aviso-${a.id}`}>
                            <Typography variant="body2" fontWeight="bold">
                                #{a.id} — {a.tipo}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Folio: {a.folio ?? 's/f'} · {String(a.creado_en ?? '').slice(0, 10)}
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
                {/* ============ AQUÍ TERMINA LISTA últimas 5 ============ */}
            </Menu>
            {/* ============ AQUÍ TERMINA MENÚ de notificaciones ============ */}
        </>
    );
}
// ============ AQUÍ TERMINA COMPONENTE CentroNotificaciones ============

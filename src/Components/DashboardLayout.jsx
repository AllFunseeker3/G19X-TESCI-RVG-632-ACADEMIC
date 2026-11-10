// ============================================================================
// ARCHIVO: src/Components/DashboardLayout.jsx
// FUNCIÓN GENERAL: layout autenticado (AppBar + drawer + contenido) con
//   menú filtrado por permisos y badge de notificaciones.
// FLUJO DE DATOS:
//   - ENTRAN: leerUsuario/getSalud (../lib/api.js) y usePermisos().
//   - SALEN: children (páginas) dentro del <Box> contenido; links a rutas.
// QUÉ MODIFICAR SI hay cambios: opciones del drawer o heartbeat, aquí mismo.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { Box, AppBar, Toolbar, Drawer, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Collapse, Avatar, IconButton, useMediaQuery } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import CentroNotificaciones from './CentroNotificaciones';
import EstadoConexion from './EstadoConexion';
import PermisosProvider, { usePermisos } from './PermisosProvider.jsx';
import { guardarToken, leerUsuario, getSalud } from '../lib/api.js';

// Íconos
import HomeIcon from '@mui/icons-material/Home';
import DescriptionIcon from '@mui/icons-material/Description';
// GridViewIcon oculto con Plantillas (2026-10-14)
// import GridViewIcon from '@mui/icons-material/GridView';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const drawerWidth = 210;

// ============ AQUÍ EMPIEZA COMPONENTE MenuInterior ============
function MenuInterior({ children }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    // En pantallas chicas el menú es temporal (Drawer) para no desbordar 390px.
    const [movilAbierto, setMovilAbierto] = useState(false);
    const esMovil = useMediaQuery('(max-width:900px)');
    const { puede, algunaCon } = usePermisos();
    const usuario = useMemo(() => leerUsuario(), []);
    const nombreUsuario = usuario?.nombre || 'Residente';
    const inicial = nombreUsuario.trim().charAt(0).toUpperCase() || 'R';

    // Heartbeat 30s: verifica API en segundo plano (api.js dispara evento si cae).
    useEffect(() => {
        const t = setInterval(() => { getSalud().catch(() => {}); }, 30000);
        return () => clearInterval(t);
    }, []);

    // HANDLER: borra JWT y regresa a /Ingreso.
    const handleLogout = () => {
        guardarToken(null);
        navigate('/Ingreso', { replace: true });
    };

    // Cierra el menú temporal al elegir una ruta final. No se usa en el botón
    // "Cartas", que solo despliega el colapso y debe dejar el menú abierto.
    const cerrarSiMovil = () => {
        if (esMovil) setMovilAbierto(false);
    };

    return (
        <Box sx={{ display: 'flex' }}>
            {/* ============ AQUÍ EMPIEZA BARRA superior ============ */}
            <AppBar id="Barra superior" position="fixed" sx={{
                width: esMovil ? '100%' : `calc(100% - ${drawerWidth}px)`,
                ml: esMovil ? 0 : `${drawerWidth}px`,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: 1,
            }}>
                <Toolbar>
                    {esMovil && (
                        <IconButton
                            color="inherit"
                            edge="start"
                            aria-label={movilAbierto ? 'Cerrar menú' : 'Abrir menú'}
                            aria-expanded={movilAbierto}
                            onClick={() => setMovilAbierto((v) => !v)}
                            sx={{ mr: 1 }}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}
                    <Typography variant="h6" noWrap component="div" fontWeight="bold" sx={{ flexGrow: 1 }}>
                        SisLegal
                    </Typography>
                    <CentroNotificaciones />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.contrastText', color: 'primary.main' }}>{inicial}</Avatar>
                        <Typography variant="body2" fontWeight="bold" sx={{ display: { xs: 'none', md: 'block' } }}>
                            {nombreUsuario}
                        </Typography>
                    </Box>
                </Toolbar>
            </AppBar>
            {/* ============ AQUÍ TERMINA BARRA superior ============ */}

            {/* ============ AQUÍ EMPIEZA MENU lateral ============ */}
            <Drawer
                id="Menu lateral"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText'
                    },
                }}
                variant={esMovil ? 'temporary' : 'permanent'}
                open={esMovil ? movilAbierto : true}
                onClose={() => setMovilAbierto(false)}
                ModalProps={{ keepMounted: true }}
                anchor="left"
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="h6" noWrap component="div" fontWeight="bold">
                        Menú
                    </Typography>
                    {esMovil && (
                        <IconButton
                            aria-label="Cerrar menú"
                            onClick={() => setMovilAbierto(false)}
                            sx={{ color: 'primary.contrastText' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    )}
                </Toolbar>

                <List>
                    <ListItem disablePadding>
                        <ListItemButton component={Link} to="/Inicio" onClick={cerrarSiMovil}>
                            <ListItemIcon><HomeIcon sx={{ color: 'primary.contrastText' }} /></ListItemIcon>
                            <ListItemText primary="Inicio" />
                        </ListItemButton>
                    </ListItem>

                    {algunaCon('ver') && (
                    <>
                    <ListItemButton onClick={() => setOpen((v) => !v)}>
                        <ListItemIcon><DescriptionIcon sx={{ color: 'primary.contrastText' }} /></ListItemIcon>
                        <ListItemText primary="Cartas" />
                        {open ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            <ListItemButton sx={{ pl: 4 }} component={Link} to="/Menu" onClick={cerrarSiMovil}>
                                <ListItemText primary="Generar carta" />
                            </ListItemButton>

                            <ListItemButton sx={{ pl: 4 }} component={Link} to="/Revision" onClick={cerrarSiMovil}>
                                <ListItemText primary="Revisar cartas" />
                            </ListItemButton>

                            <ListItemButton sx={{ pl: 4 }} component={Link} to="/Seguimiento" onClick={cerrarSiMovil}>
                                <ListItemText primary="Seguimiento" />
                            </ListItemButton>

                            {puede('cartas', 'ver') && (
                                <ListItemButton sx={{ pl: 4 }} component={Link} to="/Clientes" onClick={cerrarSiMovil}>
                                    <ListItemText primary="Clientes" />
                                </ListItemButton>
                            )}
                        </List>
                    </Collapse>

                    {/* Plantillas oculto temporalmente (2026-10-14): ruta /Plantillas sigue viva en app.jsx
                    <ListItem disablePadding>
                        <ListItemButton component={Link} to="/Plantillas">
                            <ListItemIcon><GridViewIcon sx={{ color: 'primary.contrastText' }} /></ListItemIcon>
                            <ListItemText primary="Plantillas" />
                        </ListItemButton>
                    </ListItem> */}
                    </>
                    )}

                    {puede('*', 'gestionar') && (
                        <ListItem disablePadding>
                            <ListItemButton component={Link} to="/Usuarios" onClick={cerrarSiMovil}>
                                <ListItemIcon><GroupIcon sx={{ color: 'primary.contrastText' }} /></ListItemIcon>
                                <ListItemText primary="Usuarios" />
                            </ListItemButton>
                        </ListItem>
                    )}

                    <ListItem disablePadding>
                        <ListItemButton component={Link} to="/Configuracion" onClick={cerrarSiMovil}>
                            <ListItemIcon><SettingsIcon sx={{ color: 'primary.contrastText' }} /></ListItemIcon>
                            <ListItemText primary="Configuración" />
                        </ListItemButton>
                    </ListItem>

                    <ListItem disablePadding>
                        <ListItemButton onClick={() => { cerrarSiMovil(); handleLogout(); }}>
                            <ListItemIcon><LogoutIcon sx={{ color: 'primary.contrastText' }} /></ListItemIcon>
                            <ListItemText primary="Cerrar sesión" />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Drawer>
            {/* ============ AQUÍ TERMINA MENU lateral ============ */}

            {/* ============ AQUÍ EMPIEZA CONTENIDO principal ============ */}
            <Box
                id="Contenido principal"
                component="main"
                sx={{
                    flexGrow: 1,
                    bgcolor: 'background.default',
                    p: { xs: 2, sm: 3 },
                }}
            >
                <Toolbar />
                <EstadoConexion soloError />
                {children}
            </Box>
            {/* ============ AQUÍ TERMINA CONTENIDO principal ============ */}
        </Box>
    );
}
// ============ AQUÍ TERMINA COMPONENTE MenuInterior ============

// ============ AQUÍ EMPIEZA COMPONENTE DashBoardLayout ============
export default function DashBoardLayout({ children }) {
    return (
        <PermisosProvider>
            <MenuInterior>{children}</MenuInterior>
        </PermisosProvider>
    );
}
// ============ AQUÍ TERMINA COMPONENTE DashBoardLayout ============
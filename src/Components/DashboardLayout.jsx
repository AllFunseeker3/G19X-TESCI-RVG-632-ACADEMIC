import { useEffect, useMemo, useState } from 'react';
import { Box, AppBar, Toolbar, Drawer, Typography, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Collapse, Avatar } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import CentroNotificaciones from './CentroNotificaciones';
import EstadoConexion from './EstadoConexion';
import PermisosProvider, { usePermisos } from './PermisosProvider.jsx';
import { guardarToken, leerUsuario, getSalud } from '../lib/api.js';

// Íconos
import HomeIcon from '@mui/icons-material/Home';
import DescriptionIcon from '@mui/icons-material/Description';
import GridViewIcon from '@mui/icons-material/GridView';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const drawerWidth = 210;

function MenuInterior({ children }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const { puede, algunaCon } = usePermisos();
    const usuario = useMemo(() => leerUsuario(), []);
    const nombreUsuario = usuario?.nombre || 'Residente';
    const inicial = nombreUsuario.trim().charAt(0).toUpperCase() || 'R';

    // Heartbeat 30s: verifica API en segundo plano (api.js dispara evento si cae).
    useEffect(() => {
        const t = setInterval(() => { getSalud().catch(() => {}); }, 30000);
        return () => clearInterval(t);
    }, []);

    const handleLogout = () => {
        guardarToken(null);
        navigate('/Ingreso', { replace: true });
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar id="Barra superior" position="fixed" sx={{
                width: `calc(100% - ${drawerWidth}px)`,
                ml: `${drawerWidth}px`,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: 1,
            }}>
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" fontWeight="bold" sx={{ flexGrow: 1 }}>
                        Sistema de Residencias
                    </Typography>
                    <CentroNotificaciones />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.contrastText', color: 'primary.main' }}>{inicial}</Avatar>
                        <Typography variant="body2" fontWeight="bold">
                            {nombreUsuario}
                        </Typography>
                    </Box>
                </Toolbar>
            </AppBar>

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
                variant="permanent"
                anchor="left"
            >
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" fontWeight="bold">
                        Menú
                    </Typography>
                </Toolbar>

                <List>
                    <ListItem disablePadding>
                        <ListItemButton component={Link} to="/Inicio">
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
                            <ListItemButton sx={{ pl: 4 }} component={Link} to="/Menu">
                                <ListItemText primary="Generar carta" />
                            </ListItemButton>

                            <ListItemButton sx={{ pl: 4 }} component={Link} to="/Revision">
                                <ListItemText primary="Revisar cartas" />
                            </ListItemButton>

                            <ListItemButton sx={{ pl: 4 }} component={Link} to="/Seguimiento">
                                <ListItemText primary="Seguimiento" />
                            </ListItemButton>
                        </List>
                    </Collapse>

                    <ListItem disablePadding>
                        <ListItemButton component={Link} to="/Plantillas">
                            <ListItemIcon><GridViewIcon sx={{ color: 'primary.contrastText' }} /></ListItemIcon>
                            <ListItemText primary="Plantillas" />
                        </ListItemButton>
                    </ListItem>
                    </>
                    )}

                    {puede('*', 'gestionar') && (
                        <ListItem disablePadding>
                            <ListItemButton component={Link} to="/Usuarios">
                                <ListItemIcon><GroupIcon sx={{ color: 'primary.contrastText' }} /></ListItemIcon>
                                <ListItemText primary="Usuarios" />
                            </ListItemButton>
                        </ListItem>
                    )}

                    <ListItem disablePadding>
                        <ListItemButton component={Link} to="/Configuracion">
                            <ListItemIcon><SettingsIcon sx={{ color: 'primary.contrastText' }} /></ListItemIcon>
                            <ListItemText primary="Configuración" />
                        </ListItemButton>
                    </ListItem>

                    <ListItem disablePadding>
                        <ListItemButton onClick={handleLogout}>
                            <ListItemIcon><LogoutIcon sx={{ color: 'primary.contrastText' }} /></ListItemIcon>
                            <ListItemText primary="Cerrar sesión" />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Drawer>

            <Box
                id="Contenido principal"
                component="main"
                sx={{
                    flexGrow: 1,
                    bgcolor: 'background.default',
                    p: 3,
                }}
            >
                <Toolbar />
                <EstadoConexion soloError />
                {children}
            </Box>
        </Box>
    );
}

export default function DashBoardLayout({ children }) {
    return (
        <PermisosProvider>
            <MenuInterior>{children}</MenuInterior>
        </PermisosProvider>
    );
}
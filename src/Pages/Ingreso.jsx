// ============================================================================
// ARCHIVO: src/Pages/Ingreso.jsx
// FUNCIÓN GENERAL: Pantalla de login (correo + contraseña).
//   Valida contra el back, guarda token/usuario y navega a /Inicio.
//   CC-01: si la cuenta trae contraseña temporal (debe_cambiar_contrasena),
//   muestra un paso 2 obligatorio para cambiarla antes de entrar.
// FLUJO DE DATOS:
//   - ENTRAN: credenciales del formulario hacia lib/api.js (login) y, en el
//     paso 2, {actual, nueva} hacia cambiarContrasena.
//   - SALEN: token/usuario a localStorage y navegación a Inicio.jsx.
// QUÉ MODIFICAR SI hay cambios: campos y handleLogin/handleCambio; estilos del Paper/Box.
// ============================================================================
import {
    Alert,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    IconButton,
    InputAdornment,
    InputLabel,
    Link,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import {
    cambiarContrasena,
    guardarToken,
    guardarUsuario,
    leerToken,
    leerUsuario,
    login,
} from '../lib/api.js';

// ============ AQUÍ EMPIEZA INGRESO ============
// Página de acceso: formulario controlado que autentica contra el back.
export default function Ingreso() {
    const navigate = useNavigate();
    // ============ AQUÍ EMPIEZA ESTADOS INGRESO ============
    // CC-01: si quedó una sesión con cambio obligatorio pendiente (p. ej. el
    // usuario recargó la página), arranca directo en el paso 2.
    const [cambioPendiente, setCambioPendiente] = useState(() => {
        const u = leerUsuario();
        return leerToken() && u && u.debe_cambiar_contrasena ? { usuario: u } : null;
    });
    // Campos del formulario + flags de UI (ver contraseña, error, carga).
    const [correo, setCorreo] = useState('admin@sislegal.mx');
    const [contrasena, setContrasena] = useState(cambioPendiente ? '' : 'Admin123*');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    // Paso 2 (CC-01): contraseña nueva + confirmación.
    const [nueva, setNueva] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [errorCambio, setErrorCambio] = useState('');
    const [guardandoCambio, setGuardandoCambio] = useState(false);
    const mensajeError = cambioPendiente ? errorCambio : error;
    // ============ AQUÍ TERMINA ESTADOS INGRESO ============

    // ============ AQUÍ EMPIEZA HANDLER LOGIN ============
    // Autentica, persiste sesión y redirige; muestra el mensaje del back si falla.
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setCargando(true);

        try {
            const data = await login(correo.trim(), contrasena);
            guardarToken(data.token);
            guardarUsuario(data.usuario);
            if (data.usuario?.debe_cambiar_contrasena) {
                // Contraseña temporal (CC-01): obliga el cambio antes de entrar.
                setCambioPendiente({ usuario: data.usuario });
                return;
            }
            navigate('/Inicio', { replace: true });
        } catch (err) {
            setError(err.message || 'No se pudo iniciar sesión');
        } finally {
            setCargando(false);
        }
    };
    // ============ AQUÍ TERMINA HANDLER LOGIN ============

    // ============ AQUÍ EMPIEZA HANDLER CAMBIO OBLIGATORIO (CC-01) ============
    // Guarda la contraseña nueva usando la temporal recién capturada como "actual".
    const handleCambio = async (e) => {
        e.preventDefault();
        setErrorCambio('');
        if (String(nueva).length < 8) {
            setErrorCambio('La contraseña nueva mínima es 8 caracteres');
            return;
        }
        if (nueva !== confirmar) {
            setErrorCambio('Las contraseñas nuevas no coinciden');
            return;
        }
        setGuardandoCambio(true);
        try {
            await cambiarContrasena(contrasena, nueva);
            guardarUsuario({ ...(cambioPendiente?.usuario || {}), debe_cambiar_contrasena: false });
            navigate('/Inicio', { replace: true });
        } catch (err) {
            setErrorCambio(err.message || 'No se pudo cambiar la contraseña');
        } finally {
            setGuardandoCambio(false);
        }
    };
    // ============ AQUÍ TERMINA HANDLER CAMBIO OBLIGATORIO (CC-01) ============

    return (
        // ============ AQUÍ EMPIEZA CONTENEDOR INGRESO ============
        <Box
            sx={{
                minHeight: 'calc(100vh - 16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: { xs: 2, sm: 4 },
                py: { xs: 3, md: 6 },
                bgcolor: 'background.default',
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: '100%',
                    maxWidth: 980,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' },
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'rgba(22, 49, 114, 0.12)',
                    borderRadius: 3,
                    boxShadow: '0 20px 55px rgba(22, 49, 114, 0.12)',
                }}
            >
                {/* ============ AQUÍ EMPIEZA PANEL LATERAL BIENVENIDA ============ */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: { xs: 260, md: 540 },
                        p: { xs: 4, sm: 6 },
                        color: 'primary.contrastText',
                        bgcolor: 'primary.main',
                        background: (theme) => `linear-gradient(145deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    }}
                >
                    <Box>
                        <Box
                            sx={{
                                width: 58,
                                height: 58,
                                display: 'grid',
                                placeItems: 'center',
                                mb: 4,
                                border: '1px solid',
                                borderColor: 'primary.contrastText',
                                borderRadius: 2,
                                bgcolor: 'transparent',
                            }}
                        >
                            <Typography variant="h5" fontWeight={800} letterSpacing={0}>
                                SR
                            </Typography>
                        </Box>
                        <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '2rem', md: '2.6rem' } }}>
                            Sistema de
                            <br />
                            Residencias
                        </Typography>
                        <Typography sx={{ mt: 2, maxWidth: 320, opacity: 0.85 }}>
                            Gestiona tus cartas y documentos de residencia desde un solo lugar.
                        </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 5, opacity: 0.75 }}>
                        Plataforma de gestión documental
                    </Typography>
                </Box>
                {/* ============ AQUÍ TERMINA PANEL LATERAL BIENVENIDA ============ */}

                {/* ============ AQUÍ EMPIEZA FORMULARIO ACCESO ============ */}
                <Box component="form" onSubmit={cambioPendiente ? handleCambio : handleLogin} sx={{ p: { xs: 4, sm: 6, md: 8 } }}>
                    <Stack spacing={1} sx={{ mb: 4 }}>
                        <Typography variant="overline" color="encabezado.main" fontWeight={700} letterSpacing={1.2}>
                            {cambioPendiente ? 'Primer ingreso' : 'Acceso al sistema'}
                        </Typography>
                        <Typography variant="h4" component="h1" fontWeight={800} color="encabezado.main">
                            {cambioPendiente ? 'Cambia tu contraseña' : 'Bienvenido de nuevo'}
                        </Typography>
                        <Typography color="text.secondary">
                            {cambioPendiente
                                ? 'Tu contraseña actual es temporal; crea una nueva (mínimo 8 caracteres) para continuar.'
                                : 'Ingresa tus datos para continuar.'}
                        </Typography>
                    </Stack>

                    {mensajeError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {mensajeError}
                        </Alert>
                    )}

                    {/* ============ AQUÍ EMPIEZA PASO 2: CAMBIO OBLIGATORIO (CC-01) ============ */}
                    {cambioPendiente && (
                        <Stack spacing={2.5}>
                            <Box>
                                <InputLabel
                                    shrink
                                    htmlFor="cambio-actual"
                                    sx={{ position: 'static', transform: 'none', fontSize: '0.75rem', display: 'block', mb: 0.5 }}
                                >
                                    Contraseña actual (temporal)
                                </InputLabel>
                                <TextField
                                    fullWidth
                                    id="cambio-actual"
                                    type="password"
                                    value={contrasena}
                                    onChange={(e) => setContrasena(e.target.value)}
                                    variant="standard"
                                    placeholder="La que te compartió el administrador"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlinedIcon sx={{ color: 'encabezado.main' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Box>
                            <Box>
                                <InputLabel
                                    shrink
                                    htmlFor="cambio-nueva"
                                    sx={{ position: 'static', transform: 'none', fontSize: '0.75rem', display: 'block', mb: 0.5 }}
                                >
                                    Contraseña nueva
                                </InputLabel>
                                <TextField
                                    fullWidth
                                    id="cambio-nueva"
                                    type="password"
                                    value={nueva}
                                    onChange={(e) => setNueva(e.target.value)}
                                    variant="standard"
                                    placeholder="Mínimo 8 caracteres"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlinedIcon sx={{ color: 'encabezado.main' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Box>
                            <Box>
                                <InputLabel
                                    shrink
                                    htmlFor="cambio-confirmar"
                                    sx={{ position: 'static', transform: 'none', fontSize: '0.75rem', display: 'block', mb: 0.5 }}
                                >
                                    Confirmar contraseña nueva
                                </InputLabel>
                                <TextField
                                    fullWidth
                                    id="cambio-confirmar"
                                    type="password"
                                    value={confirmar}
                                    onChange={(e) => setConfirmar(e.target.value)}
                                    variant="standard"
                                    placeholder="Repite la contraseña nueva"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockOutlinedIcon sx={{ color: 'encabezado.main' }} />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Box>
                        </Stack>
                    )}
                    {/* ============ AQUÍ TERMINA PASO 2: CAMBIO OBLIGATORIO (CC-01) ============ */}

                    {/* ============ AQUÍ EMPIEZA FORMULARIO LOGIN ============ */}
                    {!cambioPendiente && (
                    <Stack spacing={2.5}>
                        {/* ============ AQUÍ EMPIEZA CAMPO CORREO ============ */}
                        <Box>
                            <InputLabel
                                shrink
                                htmlFor="login-correo"
                                sx={{ position: 'static', transform: 'none', fontSize: '0.75rem', display: 'block', mb: 0.5 }}
                            >
                                Correo electrónico
                            </InputLabel>
                            <TextField
                                fullWidth
                                id="login-correo"
                                type="email"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                variant="standard"
                                placeholder="nombre@ejemplo.com"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailOutlinedIcon sx={{ color: 'encabezado.main' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                        {/* ============ AQUÍ TERMINA CAMPO CORREO ============ */}
                        {/* ============ AQUÍ EMPIEZA CAMPO CONTRASEÑA ============ */}
                        <Box>
                            <InputLabel
                                shrink
                                htmlFor="login-password"
                                sx={{ position: 'static', transform: 'none', fontSize: '0.75rem', display: 'block', mb: 0.5 }}
                            >
                                Contraseña
                            </InputLabel>
                            <TextField
                                fullWidth
                                id="login-password"
                                type={mostrarPassword ? 'text' : 'password'}
                                value={contrasena}
                                onChange={(e) => setContrasena(e.target.value)}
                                variant="standard"
                                placeholder="Escribe tu contraseña"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockOutlinedIcon sx={{ color: 'encabezado.main' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="Mostrar contraseña"
                                                edge="end"
                                                onClick={() => setMostrarPassword((v) => !v)}
                                            >
                                                {mostrarPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                        {/* ============ AQUÍ TERMINA CAMPO CONTRASEÑA ============ */}
                    </Stack>
                    )}
                    {/* ============ AQUÍ TERMINA FORMULARIO LOGIN ============ */}

                    {/* ============ AQUÍ EMPIEZA OPCIONES ACCESO ============ */}
                    {!cambioPendiente && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, mb: 3 }}>
                        <FormControlLabel
                            control={<Checkbox size="small" color="primary" />}
                            label={<Typography variant="body2">Recordarme</Typography>}
                        />
                        <Link href="#" underline="hover" color="encabezado.main" variant="body2" fontWeight={700}>
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </Box>
                    )}
                    {/* ============ AQUÍ TERMINA OPCIONES ACCESO ============ */}

                    {/* ============ AQUÍ EMPIEZA BOTÓN INGRESAR ============ */}
                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        type="submit"
                        disabled={cambioPendiente ? guardandoCambio : cargando}
                        sx={{ py: 1.5, borderRadius: 1.5, fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
                    >
                        {cambioPendiente ? (guardandoCambio ? 'Guardando...' : 'Guardar y continuar') : (cargando ? 'Ingresando...' : 'Ingresar')}
                    </Button>
                    {/* ============ AQUÍ TERMINA BOTÓN INGRESAR ============ */}
                </Box>
                {/* ============ AQUÍ TERMINA FORMULARIO ACCESO ============ */}
            </Paper>
        </Box>
        // ============ AQUÍ TERMINA CONTENEDOR INGRESO ============
    );
}
// ============ AQUÍ TERMINA INGRESO ============

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
import { guardarToken, guardarUsuario, login } from '../lib/api.js';

export default function Ingreso() {
    const navigate = useNavigate();
    const [correo, setCorreo] = useState('admin@sislegal.mx');
    const [contrasena, setContrasena] = useState('Admin123*');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setCargando(true);

        try {
            const data = await login(correo.trim(), contrasena);
            guardarToken(data.token);
            guardarUsuario(data.usuario);
            navigate('/Inicio', { replace: true });
        } catch (err) {
            setError(err.message || 'No se pudo iniciar sesión');
        } finally {
            setCargando(false);
        }
    };

    return (
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

                <Box component="form" onSubmit={handleLogin} sx={{ p: { xs: 4, sm: 6, md: 8 } }}>
                    <Stack spacing={1} sx={{ mb: 4 }}>
                        <Typography variant="overline" color="encabezado.main" fontWeight={700} letterSpacing={1.2}>
                            Acceso al sistema
                        </Typography>
                        <Typography variant="h4" component="h1" fontWeight={800} color="encabezado.main">
                            Bienvenido de nuevo
                        </Typography>
                        <Typography color="text.secondary">
                            Ingresa tus datos para continuar.
                        </Typography>
                    </Stack>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <Stack spacing={2.5}>
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
                    </Stack>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5, mb: 3 }}>
                        <FormControlLabel
                            control={<Checkbox size="small" color="primary" />}
                            label={<Typography variant="body2">Recordarme</Typography>}
                        />
                        <Link href="#" underline="hover" color="encabezado.main" variant="body2" fontWeight={700}>
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </Box>

                    <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        type="submit"
                        disabled={cargando}
                        sx={{ py: 1.5, borderRadius: 1.5, fontWeight: 700, textTransform: 'none', boxShadow: 'none' }}
                    >
                        {cargando ? 'Ingresando...' : 'Ingresar'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
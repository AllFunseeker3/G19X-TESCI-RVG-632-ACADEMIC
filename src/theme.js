/* ============================================================================
 * ARCHIVO: src/theme.js
 * FUNCIÓN GENERAL: fábrica del tema MUI (modo claro/oscuro + 4 acentos).
 *   - Define ACCENTOS: azul (actual), rojo, verde y blanco.
 *   - buildAppTheme(mode, accentId) crea el theme según Configuración.
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE): Components/ThemeModeProvider.jsx ->
 *     le pasa (mode, accentId) guardados en localStorage.
 *   - SALEN (DATOS QUE SE MANDAN A <archivo> para procesamiento):
 *     -> ThemeModeProvider: usa el theme en <ThemeProvider theme={...}>.
 * QUÉ MODIFICAR SI hay cambios:
 *   - Nuevo color: agrega entrada en ACCENTOS (main + contrastText cómodos).
 *   - Ajuste global de letra: typography de abajo (se mantiene escala -5%).
 * ========================================================================== */
import { createTheme } from '@mui/material/styles';

// Catálogo de acentos elegibles desde Configuración.
// main: color de AppBar, drawer, botones contained y banners.
// contrastText: texto/iconos encima del acento (debe contrastar SIEMPRE).
// Tonos mate (no neón) para que sea cómodo a la vista en claro y oscuro.
export const ACCENTOS = {
    azul: {
        id: 'azul',
        nombre: 'Azul institucional',
        main: '#163172',
        contrastText: '#ffffff',
    },
    rojo: {
        id: 'rojo',
        nombre: 'Rojo',
        main: '#a02a2a',
        contrastText: '#ffffff',
    },
    verde: {
        id: 'verde',
        nombre: 'Verde',
        main: '#1f6b3d',
        contrastText: '#ffffff',
    },
    blanco: {
        id: 'blanco',
        nombre: 'Blanco',
        main: '#e9eef3',
        contrastText: '#163172',
    },
};

export const ACCENTO_IDS = Object.keys(ACCENTOS);
export const MODO_CLARO = 'light';
export const MODO_OSCURO = 'dark';

// Color de encabezados/títulos/iconos SOBRE papel (fondo claro u oscuro).
// Por qué existe: primary.main no sirve como texto en 2 casos:
//  - acento blanco en modo claro (gris claro sobre blanco = invisible);
//  - acentos oscuros en modo oscuro (azul marino sobre fondo oscuro = invisible).
// En claro usa el tono fuerte de cada acento; en oscuro un tono claro legible.
export const ENCABEZADOS = {
    [MODO_CLARO]: {
        azul: '#163172',
        rojo: '#a02a2a',
        verde: '#1f6b3d',
        blanco: '#163172',
    },
    [MODO_OSCURO]: {
        azul: '#93a9e8',
        rojo: '#e59a9a',
        verde: '#86cf9f',
        blanco: '#ffffff',
    },
};

// QUÉ HACE: construye el theme MUI para (mode, accentId).
// - mode 'light': fondo blanco, papel blanco.
// - mode 'dark': fondo azul-gris muy oscuro y papel ligeramente más claro
//   (cómodo a la vista, sin negros puros).
// - El acento se aplica igual en ambos modos; MUI deriva primary.dark/light.
export function buildAppTheme(mode = MODO_CLARO, accentId = 'azul') {
    const acento = ACCENTOS[accentId] ?? ACCENTOS.azul;
    const oscuro = mode === MODO_OSCURO;
    const claveAcento = ACCENTOS[accentId] ? accentId : 'azul';
    return createTheme({
        palette: {
            mode,
            primary: {
                main: acento.main,
                contrastText: acento.contrastText,
            },
            // Texto/títulos/iconos sobre papel: siempre legible (ver ENCABEZADOS).
            encabezado: {
                main: ENCABEZADOS[oscuro ? MODO_OSCURO : MODO_CLARO][claveAcento],
            },
            secondary: {
                main: '#fff', // Color secundario
            },
            background: oscuro
                ? { default: '#0f1522', paper: '#172033' }
                : { default: '#fff', paper: '#fff' },
        },
        typography: {
            // Escala global compacta: base html 87.5% + títulos/cuerpo reducidos
            // para que todo se vea un poco más chico y cómodo a la vista.
            h4: { fontSize: '1.75rem' },
            h5: { fontSize: '1.25rem' },
            h6: { fontSize: '1.05rem' },
            subtitle1: { fontSize: '0.9rem' },
            subtitle2: { fontSize: '0.825rem' },
            body1: { fontSize: '0.9rem' },
            body2: { fontSize: '0.875rem' },
            caption: { fontSize: '0.75rem' },
            button: { fontSize: '0.85rem' },
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    // Base global en vez de 100%: todo lo basado en rem se compacta.
                    html: { fontSize: '87.5%' },
                },
            },
        },
    });
}

// Tema por defecto (compatibilidad): claro + azul institucional.
const theme = buildAppTheme(MODO_CLARO, 'azul');

export default theme;

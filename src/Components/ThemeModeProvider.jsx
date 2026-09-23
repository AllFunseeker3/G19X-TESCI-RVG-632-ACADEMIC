/* eslint-disable react-refresh/only-export-components -- el hook useThemeMode vive junto a su provider a propósito */
/* ============================================================================
 * ARCHIVO: src/Components/ThemeModeProvider.jsx
 * FUNCIÓN GENERAL: estado global de apariencia (modo + acento) y ThemeProvider.
 *   - Guarda en localStorage: 'plurione-theme-mode' (light/dark) y
 *     'plurione-theme-accent' (azul/rojo/verde/blanco).
 *   - Construye el theme con buildAppTheme(mode, accentId) de ../theme.js.
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE): ../theme.js (ACCENTOS, buildAppTheme);
 *     localStorage (preferencias guardadas).
 *   - SALEN (DATOS QUE SE MANDAN A <archivo> para procesamiento):
 *     -> main.jsx: envuelve <App/> para que toda la interfaz use el theme.
 *     -> Pages/Configuracion.jsx: usa useThemeMode() para leer y cambiar
 *        (mode, accentId, oscuro, alternarModo, elegirAcento, restablecer).
 * QUÉ MODIFICAR SI hay cambios: claves de localStorage o valores por defecto
 *   (MODO_POR_DEFECTO / ACENTO_POR_DEFECTO) aquí mismo.
 * ========================================================================== */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ACCENTO_IDS, buildAppTheme, MODO_CLARO, MODO_OSCURO } from '../theme.js';

const CLAVE_MODO = 'plurione-theme-mode';
const CLAVE_ACENTO = 'plurione-theme-accent';
const MODO_POR_DEFECTO = MODO_CLARO;
const ACENTO_POR_DEFECTO = 'azul';

// Lee localStorage con validación (si el valor no existe o es inválido, usa defecto).
function leerModoInicial() {
    try {
        const v = window.localStorage.getItem(CLAVE_MODO);
        return v === MODO_OSCURO ? MODO_OSCURO : MODO_POR_DEFECTO;
    } catch {
        return MODO_POR_DEFECTO;
    }
}

function leerAcentoInicial() {
    try {
        const v = window.localStorage.getItem(CLAVE_ACENTO);
        return ACCENTO_IDS.includes(v) ? v : ACENTO_POR_DEFECTO;
    } catch {
        return ACENTO_POR_DEFECTO;
    }
}

const ThemeModeContext = createContext(null);

// Hook para leer/cambiar apariencia desde cualquier página (lo usa Configuración).
export function useThemeMode() {
    const ctx = useContext(ThemeModeContext);
    if (!ctx) throw new Error('useThemeMode debe usarse dentro de <ThemeModeProvider>');
    return ctx;
}

// Proveedor: envuelve la app y aplica el theme MUI correspondiente.
export default function ThemeModeProvider({ children }) {
    const [mode, setMode] = useState(leerModoInicial);
    const [accentId, setAccentId] = useState(leerAcentoInicial);

    // Persiste cada cambio para que sobreviva recargas.
    useEffect(() => {
        try {
            window.localStorage.setItem(CLAVE_MODO, mode);
        } catch {
            /* almacenamiento no disponible: se ignora */
        }
    }, [mode]);

    useEffect(() => {
        try {
            window.localStorage.setItem(CLAVE_ACENTO, accentId);
        } catch {
            /* almacenamiento no disponible: se ignora */
        }
    }, [accentId]);

    // Memoriza el theme para no recrearlo en cada render.
    const theme = useMemo(() => buildAppTheme(mode, accentId), [mode, accentId]);

    const valor = useMemo(
        () => ({
            mode,
            accentId,
            oscuro: mode === MODO_OSCURO,
            alternarModo: () => setMode((m) => (m === MODO_OSCURO ? MODO_CLARO : MODO_OSCURO)),
            fijarModo: (m) => setMode(m === MODO_OSCURO ? MODO_OSCURO : MODO_CLARO),
            elegirAcento: (id) => {
                if (ACCENTO_IDS.includes(id)) setAccentId(id);
            },
            restablecer: () => {
                setMode(MODO_POR_DEFECTO);
                setAccentId(ACENTO_POR_DEFECTO);
            },
        }),
        [mode, accentId],
    );

    return (
        <ThemeModeContext.Provider value={valor}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeModeContext.Provider>
    );
}

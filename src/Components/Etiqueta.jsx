import { InputLabel } from '@mui/material';

// Etiqueta fija SIEMPRE arriba del campo (no flotante): así es
// imposible que el texto se encime con la caja en cualquier versión de MUI.
// Reutilizable en Ingreso, Revisión, Seguimiento, Inicio y GenerarCarta.
export default function Etiqueta({ htmlFor, requerido, children }) {
    return (
        <InputLabel
            shrink
            htmlFor={htmlFor}
            required={requerido}
            sx={{
                position: 'static',
                transform: 'none',
                fontSize: '0.79rem',
                display: 'block',
                mb: 0.5,
            }}
        >
            {children}
        </InputLabel>
    );
}
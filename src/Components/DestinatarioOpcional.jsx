import { Box, Typography, TextField, Checkbox, FormControlLabel, Tooltip } from '@mui/material';
import Etiqueta from './Etiqueta';

// Checkbox "¿Desea agregar un destinatario?" + campo condicional.
// Si no está marcado, el destinatario por defecto es "A quien corresponda".
export default function DestinatarioOpcional({
    marcado,
    valor,
    error,
    onCheck,
    onChange,
}) {
    return (
        <>
            <Box sx={{ mt: 2, mb: 1 }}>
                <FormControlLabel
                    control={<Checkbox checked={marcado} onChange={onCheck} color="primary" />}
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2">
                                ¿Desea agregar un destinatario?
                            </Typography>
                            <Tooltip
                                title='Al dejar desmarcada esta opción el destinatario por defecto será "A quien corresponda"'
                                arrow
                                placement="top"
                            >
                                <Typography
                                    component="span"
                                    sx={{
                                        cursor: 'help',
                                        fontWeight: 'bold',
                                        color: 'encabezado.main',
                                        border: '1px solid',
                                        borderColor: 'encabezado.main',
                                        borderRadius: '50%',
                                        width: 18,
                                        height: 18,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        lineHeight: 1,
                                    }}
                                >
                                    ¡
                                </Typography>
                            </Tooltip>
                        </Box>
                    }
                />
            </Box>

            {marcado && (
                <Box sx={{ mt: 1, mb: 5, pb: 1, maxWidth: { xs: '100%', md: '33%' } }}>
                    <Etiqueta htmlFor="campo-destinatario" requerido>
                        Destinatario
                    </Etiqueta>
                    <TextField
                        id="campo-destinatario"
                        fullWidth
                        variant="standard"
                        type="text"
                        required
                        error={Boolean(error)}
                        helperText={error ?? ''}
                        value={valor ?? ''}
                        onChange={onChange}
                        placeholder="Nombre del destinatario"
                        sx={{ mt: 1 }}
                    />
                </Box>
            )}
        </>
    );
}
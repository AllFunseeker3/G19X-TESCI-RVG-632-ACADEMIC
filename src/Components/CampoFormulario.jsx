/* eslint-disable react-refresh/only-export-components -- helpers de fecha se exportan junto al campo a propósito */
import { useRef, useState } from 'react';
import {
  Box, NativeSelect, Typography, TextField, Button, InputAdornment,
  Checkbox, FormControlLabel, Switch, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CloseIcon from '@mui/icons-material/Close';
import Etiqueta from './Etiqueta';

// Helpers de fecha dd/mm/aaaa (los usa GenerarCarta para validar y auto-hoy).
export function formatearHoyDDMMAAAA() {
  const h = new Date();
  const dd = String(h.getDate()).padStart(2, '0');
  const mm = String(h.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${h.getFullYear()}`;
}

// Valida dd/mm/aaaa real (días por mes, bisiestos, año razonable).
export function esFechaValida(v) {
  if (typeof v !== 'string') return false;
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const aa = Number(m[3]);
  if (aa < 1900 || aa > 2100) return false;
  if (mm < 1 || mm > 12) return false;
  const dias = new Date(aa, mm, 0).getDate();
  return dd >= 1 && dd <= dias;
}

// Convierte ISO yyyy-mm-dd (picker nativo) -> dd/mm/aaaa.
export function isoA_ddmmaaaa(iso) {
  const m = typeof iso === 'string' && iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// Convierte dd/mm/aaaa -> ISO (para precargar el picker oculto).
function ddmmaaaaA_iso(v) {
  const m = typeof v === 'string' && v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// Campo genérico del formulario dinámico.
// Soporta tipos: texto | area | fecha | email | seleccion | moneda | fotos | check | switch | anexos
// Reutilizable en cualquier pestaña que pida datos por catálogo (GenerarCarta,
// Revisión, Seguimiento o futuros formularios).
export default function CampoFormulario({
  campo,
  valor,
  error,
  ayudaVisible,
  onChange,
  onFocus,
  onBlur,
  onQuitarAnexo,
}) {
  const idCampo = `campo-${campo.id}`;
  const [vistaPrevia, setVistaPrevia] = useState(null); // { url, nombre }
  const pickerRef = useRef(null);

  const comun = {
    id: idCampo,
    fullWidth: true,
    variant: 'standard',
    value: valor ?? '',
    onChange,
    onFocus,
    onClick: onFocus,
    onBlur,
    required: campo.requerido,
    error: Boolean(error),
    helperText: error ?? '',
  };

  const nombreArchivo = (a) => (typeof a === 'string' ? a : a?.name ?? '');

  const abrirVistaPrevia = (archivo) => {
    if (typeof archivo === 'string') return; // solo Files reales tienen preview
    try {
      const url = URL.createObjectURL(archivo);
      setVistaPrevia({ url, nombre: archivo.name });
    } catch {
      /* sin preview disponible */
    }
  };

  const cerrarVistaPrevia = () => {
    if (vistaPrevia?.url) {
      try { URL.revokeObjectURL(vistaPrevia.url); } catch { /* noop */ }
    }
    setVistaPrevia(null);
  };

  // ---- SWITCH ----
  if (campo.tipo === 'switch') {
    return (
      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(valor)}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
              color="primary"
              inputProps={{ id: idCampo }}
            />
          }
          label={<Typography variant="body2">{campo.etiqueta}</Typography>}
        />
        {error && (
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>
            {error}
          </Typography>
        )}
        {campo.ayuda && ayudaVisible && (
          <Box role="note" sx={{ mt: 1, px: 1.5, py: 1, bgcolor: 'rgba(2, 136, 210, 0.08)', borderLeft: '3px solid #0288d2', borderRadius: 1 }}>
            <Typography variant="caption" color="info.main">{campo.ayuda}</Typography>
          </Box>
        )}
      </Box>
    );
  }

  // ---- CHECK ----
  if (campo.tipo === 'check') {
    return (
      <Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(valor)}
              onChange={onChange}
              onFocus={onFocus}
              onBlur={onBlur}
              color="primary"
              id={idCampo}
            />
          }
          label={<Typography variant="body2">{campo.etiqueta}</Typography>}
        />
        {error && (
          <Typography variant="caption" color="error" sx={{ display: 'block' }}>
            {error}
          </Typography>
        )}
      </Box>
    );
  }

  // ---- ANEXOS (solo PDF) ----
  if (campo.tipo === 'anexos') {
    const archivos = Array.isArray(valor) ? valor : [];
    return (
      <Box>
        <Etiqueta htmlFor={idCampo} requerido={campo.requerido}>
          {campo.etiqueta}
        </Etiqueta>
        <Button variant="outlined" color="primary" component="label" sx={{ borderColor: 'encabezado.main', color: 'encabezado.main' }}>
          Anexos (solo PDF)
          <input hidden id={idCampo} accept="application/pdf,.pdf" multiple type="file" onChange={onChange} />
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {archivos.length > 0
            ? `Se adjunta(n) ${archivos.length} documento(s) como anexo: ${archivos.map(nombreArchivo).join(', ')}`
            : 'Solo se permiten archivos PDF'}
        </Typography>
        {archivos.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {archivos.map((a, i) => (
              <Box key={`${nombreArchivo(a)}-${i}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  size="small"
                  sx={{ textTransform: 'none', justifyContent: 'flex-start', p: 0, minWidth: 0 }}
                  onClick={() => abrirVistaPrevia(a)}
                  disabled={typeof a === 'string'}
                >
                  {nombreArchivo(a)}
                </Button>
                <IconButton
                  size="small"
                  aria-label={`Quitar ${nombreArchivo(a)}`}
                  onClick={() => onQuitarAnexo?.(i)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
        {error && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
            {error}
          </Typography>
        )}
        <Dialog
          open={Boolean(vistaPrevia)}
          onClose={( _e, reason) => {
            if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
            cerrarVistaPrevia();
          }}
          disableEscapeKeyDown
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {vistaPrevia?.nombre ?? 'Vista previa'}
            <IconButton aria-label="Cerrar vista previa" onClick={cerrarVistaPrevia}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {vistaPrevia?.url && (
              <Box component="iframe" src={vistaPrevia.url} title={vistaPrevia.nombre} sx={{ width: '100%', height: '70vh', border: 0 }} />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={cerrarVistaPrevia} color="primary" variant="contained">
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // ---- FECHA dd/mm/aaaa con máscara + picker nativo oculto ----
  if (campo.tipo === 'fecha') {
    const abrirPicker = () => {
      const el = pickerRef.current;
      if (!el) return;
      try {
        if (typeof el.showPicker === 'function') el.showPicker();
        else el.click();
      } catch {
        el.click();
      }
    };
    const alElegirPicker = (e) => {
      const iso = e.target.value;
      const ddmmaa = isoA_ddmmaaaa(iso);
      if (!ddmmaa) return;
      // Reutiliza onChange del padre con un evento sintético { target: { value } }.
      onChange?.({ target: { value: ddmmaa } });
      e.target.value = '';
    };
    const adornoCalendario = {
      endAdornment: (
        <InputAdornment position="end">
          <IconButton aria-label="Elegir fecha" edge="end" onClick={abrirPicker} tabIndex={-1} sx={{ color: 'encabezado.main' }}>
            <CalendarTodayIcon />
          </IconButton>
        </InputAdornment>
      ),
    };
    return (
      <Box>
        <Etiqueta htmlFor={idCampo} requerido={campo.requerido}>
          {campo.etiqueta}
        </Etiqueta>
        <TextField
          {...comun}
          type="text"
          placeholder="dd/mm/aaaa"
          inputProps={{ maxLength: 10, inputMode: 'numeric', placeholder: 'dd/mm/aaaa' }}
          InputProps={adornoCalendario}
          slotProps={{ input: adornoCalendario }}
        />
        <input
          ref={pickerRef}
          type="date"
          hidden
          aria-hidden
          tabIndex={-1}
          value=""
          onChange={alElegirPicker}
        />
        {/* valor ISO precargado para el picker (no visible, solo referencia) */}
        <input type="hidden" value={ddmmaaaaA_iso(valor)} readOnly />
        {campo.ayuda && ayudaVisible && (
          <Box role="note" sx={{ mt: 1, px: 1.5, py: 1, bgcolor: 'rgba(2, 136, 210, 0.08)', borderLeft: '3px solid #0288d2', borderRadius: 1 }}>
            <Typography variant="caption" color="info.main">{campo.ayuda}</Typography>
          </Box>
        )}
      </Box>
    );
  }

  let control;
  if (campo.tipo === 'area') {
    control = <TextField {...comun} multiline rows={campo.filas ?? 3} />;
  } else if (campo.tipo === 'moneda') {
    const adornoMoneda = {
      startAdornment: <InputAdornment position="start">$</InputAdornment>,
    };
    control = (
      <TextField
        {...comun}
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        InputProps={adornoMoneda}
        slotProps={{ input: adornoMoneda }}
      />
    );
  } else if (campo.tipo === 'fotos') {
    const archivos = Array.isArray(valor) ? valor : [];
    const nombres = archivos.map(nombreArchivo);
    control = (
      <Box>
        <Button variant="outlined" color="primary" component="label" sx={{ borderColor: 'encabezado.main', color: 'encabezado.main' }}>
          Agregar fotos
          <input hidden accept="image/*,.jpg,.jpeg,.png" multiple type="file" onChange={onChange} />
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {nombres.length > 0
            ? `${nombres.length} foto(s): ${nombres.join(', ')}`
            : 'JPG o PNG de las condiciones del equipo'}
        </Typography>
        {error && (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
            {error}
          </Typography>
        )}
      </Box>
    );
  } else if (campo.tipo === 'email') {
    control = <TextField {...comun} type="email" />;
  } else if (campo.tipo === 'seleccion') {
    control = (
      <Box>
        <NativeSelect
          fullWidth
          required={campo.requerido}
          error={Boolean(error)}
          value={valor ?? ''}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          inputProps={{ name: campo.id, id: idCampo }}
          sx={error ? { borderBottom: '2px solid #d32f2f' } : undefined}
        >
          <option value="">Seleccione una opción</option>
          {(campo.opciones ?? []).map((op) => (
            <option key={op} value={op}>{op}</option>
          ))}
        </NativeSelect>
        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
      </Box>
    );
  } else {
    control = <TextField {...comun} type="text" />;
  }

  const mostrarAyuda = campo.ayuda && ayudaVisible;

  return (
    <Box>
      <Etiqueta htmlFor={idCampo} requerido={campo.requerido}>
        {campo.etiqueta}
      </Etiqueta>
      {control}
      {mostrarAyuda && (
        <Box
          role="note"
          sx={{
            mt: 1,
            px: 1.5,
            py: 1,
            bgcolor: 'rgba(2, 136, 210, 0.08)',
            borderLeft: '3px solid #0288d2',
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" color="info.main">
            {campo.ayuda}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// ARCHIVO: src/Components/ResumenDocumento.jsx
// FUNCIÓN GENERAL: diálogo de resumen previo a confirmar (categoría, tipo,
//   destinatario y campos con formato legible).
// FLUJO DE DATOS:
//   - ENTRAN: abierto, categoriaNombre, tipoNombre, destinatario, campos,
//     datos y onCerrar del padre (GenerarCarta).
//   - SALEN: solo visual; Confirmar/Cerrar delegan a onCerrar del padre.
// QUÉ MODIFICAR SI hay cambios: formato por tipo en formatoValorResumen.
// ============================================================================
import {
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, List, ListItem, ListItemText, Alert, CircularProgress,
} from '@mui/material';
import { esFechaValida } from './CampoFormulario';

// ============ AQUÍ EMPIEZA HELPERS de formato ============
// Convierte ISO yyyy-mm-dd -> dd/mm/aaaa; si ya es dd/mm/aaaa lo deja tal cual.
function formatoFechaResumen(valor) {
  if (!valor) return '—';
  if (typeof valor === 'string' && esFechaValida(valor)) return valor;
  const m = typeof valor === 'string' && valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return valor || '—';
}

function nombreAnexo(a) {
  return typeof a === 'string' ? a : a?.name ?? '';
}

// Dialog de resumen previo a confirmar.
// Reutilizable en GenerarCarta y adaptable a Revisión.
function formatoValorResumen(campo, valor) {
  if (campo.tipo === 'moneda') return valor ? `$${valor}` : '—';
  if (campo.tipo === 'check') return valor ? 'Sí' : 'No';
  if (campo.tipo === 'switch') {
    // Texto especial para Art. 8; el resto Sí/No.
    if (campo.id === 'fundamentarArt8') {
      return valor ? 'Con fundamento en el artículo 8 Constitucional' : 'No';
    }
    if (campo.id === 'acuseRecibo') {
      return valor ? 'Sí — incluye bloque Nombre / Firma / Fecha / Hora' : 'No';
    }
    if (campo.id === 'transferencia') {
      return valor ? 'Sí' : 'No';
    }
    return valor ? 'Sí' : 'No';
  }
  if (campo.tipo === 'fecha') return formatoFechaResumen(valor);
  if (campo.tipo === 'fotos') {
    const arr = Array.isArray(valor) ? valor : [];
    return arr.length > 0
      ? `${arr.length} foto(s): ${arr.map(nombreAnexo).join(', ')}`
      : '—';
  }
  if (campo.tipo === 'anexos') {
    const arr = Array.isArray(valor) ? valor : [];
    return arr.length > 0
      ? `Se adjuntará(n) ${arr.length} documento(s) al confirmar: ${arr.map(nombreAnexo).join(', ')}`
      : '—';
  }
  if (campo.tipo === 'area' || campo.tipo === 'texto' || campo.tipo === 'email' || campo.tipo === 'seleccion') {
    return valor || '—';
  }
  return valor || '—';
}
// ============ AQUÍ TERMINA HELPERS de formato ============

// ============ AQUÍ EMPIEZA COMPONENTE ResumenDocumento ============
export default function ResumenDocumento({
  abierto,
  categoriaNombre,
  tipoNombre,
  mostrarDestinatario,
  agregarDestinatario,
  destinatarioValor,
  campos,
  datos,
  onCerrar,
  onConfirmar,
  guardando = false,
  errorGuardar = '',
  textoConfirmar = 'Confirmar',
}) {
  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
      {/* ============ AQUÍ EMPIEZA TÍTULO del resumen ============ */}
      <DialogTitle color="encabezado.main" fontWeight="bold">
        Resumen del documento
      </DialogTitle>
      {/* ============ AQUÍ TERMINA TÍTULO del resumen ============ */}
      {/* ============ AQUÍ EMPIEZA LISTA de campos ============ */}
      <DialogContent dividers>
        <Typography variant="subtitle1" fontWeight="bold">
          {categoriaNombre} — {tipoNombre}
        </Typography>
        <List dense>
          {mostrarDestinatario && (
            <ListItem disablePadding sx={{ py: 0.5 }}>
              <ListItemText
                primary="Destinatario"
                secondary={agregarDestinatario ? (destinatarioValor || '—') : 'A quien corresponda'}
              />
            </ListItem>
          )}
          {campos.map((c) => (
            <ListItem key={c.id} disablePadding sx={{ py: 0.5 }}>
              <ListItemText
                primary={c.etiqueta}
                secondary={formatoValorResumen(c, datos[c.id])}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      {/* ============ AQUÍ TERMINA LISTA de campos ============ */}
      {/* ============ AQUÍ EMPIEZA ACCIONES cerrar/confirmar ============ */}
      <DialogActions>
        <Button onClick={onCerrar} color="primary" disabled={guardando}>
          Cerrar
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={onConfirmar ?? onCerrar}
          disabled={guardando}
          startIcon={guardando ? <CircularProgress size={18} /> : null}
        >
          {guardando ? 'Generando...' : textoConfirmar}
        </Button>
      </DialogActions>
      {errorGuardar && (
        <Alert severity="error" sx={{ m: 2, mt: 0 }}>{errorGuardar}</Alert>
      )}
      {/* ============ AQUÍ TERMINA ACCIONES cerrar/confirmar ============ */}
    </Dialog>
  );
}
// ============ AQUÍ TERMINA COMPONENTE ResumenDocumento ============

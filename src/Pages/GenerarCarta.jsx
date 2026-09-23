// ============================================================================
// ARCHIVO: src/Pages/GenerarCarta.jsx
// FUNCIÓN GENERAL: formulario dinámico para generar documentos legales.
//   Campo 1 categoría -> Campo 2 tipo -> campos según tiposDocumentos.js.
// FLUJO:
//   - ENTRAN: lib/tiposDocumentos.js (CATEGORIAS, tipos, campos con mostrarSi).
//   - SALEN: -> Components/ResumenDocumento.jsx (Dialog de confirmación).
// QUÉ MODIFICAR SI hay cambios: Box por tipo abajo; mostrarDestinatario excluye
//   9 tipos con destinatario fijo; solo id==='fecha' lleva hoy auto.
// ============================================================================
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Button, Divider } from '@mui/material';
import {
  CATEGORIAS, tiposDeCategoria, nombreCategoria,
  nombreTipo, camposDeTipo,
} from '../lib/tiposDocumentos';
import PageHeader from '../Components/PageHeader';
import CampoFormulario, { esFechaValida, formatearHoyDDMMAAAA } from '../Components/CampoFormulario';
import SeccionFormulario from '../Components/SeccionFormulario';
import SelectorCategoriaTipo from '../Components/SelectorCategoriaTipo';
import DestinatarioOpcional from '../Components/DestinatarioOpcional';
import ResumenDocumento from '../Components/ResumenDocumento';

// Tipos con destinatario fijo (sin checkbox opcional). Solo carta-poder y
// carta-intencion usan destinatario opcional ("A quien corresponda").
const TIPOS_SIN_DESTINATARIO_OPCIONAL = new Set([
  'carta-responsiva',
  'carta-renuncia',
  'oficio-peticion',
  'oficio-comision',
  'oficio-resolucion',
  'aviso-privacidad',
  'aviso-rescision',
  'aviso-funcionamiento',
  'notificacion-general',
]);

// Solo id==='fecha' lleva hoy auto (emisión/firma/aviso/actualización).
// No auto: fechaInicio, fechaFin, vigencia, ultimoDia, fechaRescision, fechaApertura.
function datosInicialesPorTipo(campos) {
  const ini = {};
  const hoy = formatearHoyDDMMAAAA();
  campos.forEach((c) => {
    if (c.id === 'fecha' && c.tipo === 'fecha') ini.fecha = hoy;
  });
  return ini;
}

// Máscara auto dd/mm/aaaa mientras escribe (solo dígitos).
function aplicarMascaraFecha(v) {
  const d = (v ?? '').replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export default function GenerarCarta() {
  const [categoria, setCategoria] = useState('');
  const [tipoDoc, setTipoDoc] = useState('');
  const [datos, setDatos] = useState({});
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [campoEnfocado, setCampoEnfocado] = useState(null);
  const [agregarDestinatario, setAgregarDestinatario] = useState(false);
  const [errores, setErrores] = useState({});
  const [params] = useSearchParams();
  const [claveAplicada, setClaveAplicada] = useState('');

  const claveParams = `${params.get('categoria') ?? ''}|${params.get('tipo') ?? ''}`;
  if (claveParams !== claveAplicada) {
    setClaveAplicada(claveParams);
    const [cat, tipo] = claveParams.split('|');
    const catValida = CATEGORIAS.some((c) => c.id === cat);
    const tipoValido = catValida && tiposDeCategoria(cat).some((t) => t.id === tipo);
    const catF = catValida ? cat : '';
    const tipoF = tipoValido ? tipo : '';
    setCategoria(catF);
    setTipoDoc(tipoF);
    setDatos(tipoF ? datosInicialesPorTipo(camposDeTipo(tipoF)) : {});
    setCampoEnfocado(null);
    setAgregarDestinatario(false);
    setErrores({});
  }

  const tiposDisponibles = tiposDeCategoria(categoria);
  const campos = camposDeTipo(tipoDoc);

  const esVisible = (campo) => {
    if (!campo.mostrarSi) return true;
    const actual = datos[campo.mostrarSi.campo];
    return actual === campo.mostrarSi.valor;
  };
  const camposVisibles = campos.filter(esVisible);
  const mostrarDestinatario = tipoDoc !== '' && !TIPOS_SIN_DESTINATARIO_OPCIONAL.has(tipoDoc);

  const limpiarDependientes = (id, valor, copiaDatos, copiaErrores) => {
    if (id === 'estadoFisico' && valor !== 'Con detalles') {
      delete copiaDatos.especifiqueDetalles;
      delete copiaErrores.especifiqueDetalles;
    }
    if (id === 'motivo' && valor !== 'Otro') {
      delete copiaDatos.especifiqueMotivo;
      delete copiaErrores.especifiqueMotivo;
    }
    if ((id === 'ccp' || id === 'viaticos' || id === 'transferencia') && valor !== true) {
      const mapa = { ccp: 'ccpDetalle', viaticos: 'montoViaticos', transferencia: 'transferenciaDetalle' };
      delete copiaDatos[mapa[id]];
      delete copiaErrores[mapa[id]];
    }
  };

  const handleCategoria = (e) => {
    setCategoria(e.target.value);
    setTipoDoc('');
    setDatos({});
    setCampoEnfocado(null);
    setAgregarDestinatario(false);
    setErrores({});
  };

  const handleTipo = (e) => {
    const t = e.target.value;
    setTipoDoc(t);
    setDatos(datosInicialesPorTipo(camposDeTipo(t)));
    setCampoEnfocado(null);
    setAgregarDestinatario(false);
    setErrores({});
  };

  const handleDato = (id) => (e) => {
    const valor = e.target.value;
    setDatos((prev) => {
      const copia = { ...prev, [id]: valor };
      limpiarDependientes(id, valor, copia, {});
      return copia;
    });
    setErrores((prev) => {
      if (!prev[id]) return prev;
      const copia = { ...prev };
      delete copia[id];
      limpiarDependientes(id, valor, {}, copia);
      return copia;
    });
  };

  const handleDatoFecha = (id) => (e) => {
    const valor = aplicarMascaraFecha(e.target.value);
    setDatos((prev) => ({ ...prev, [id]: valor }));
    setErrores((prev) => {
      if (!prev[id]) return prev;
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  };

  const handleDatoMoneda = (id) => (e) => {
    const soloNumeros = e.target.value.replace(/[^0-9.]/g, '');
    setDatos((prev) => ({ ...prev, [id]: soloNumeros }));
    setErrores((prev) => {
      if (!prev[id]) return prev;
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  };

  const handleFotos = (id) => (e) => {
    const archivos = Array.from(e.target.files ?? []).map((f) => f.name);
    setDatos((prev) => ({ ...prev, [id]: archivos }));
    setErrores((prev) => {
      if (!prev[id]) return prev;
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
    e.target.value = '';
  };

  const handleAnexos = (id) => (e) => {
    const elegidos = Array.from(e.target.files ?? []);
    const noPdf = elegidos.filter((f) => {
      const esPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      return !esPdf;
    });
    if (noPdf.length > 0) {
      setErrores((prev) => ({ ...prev, [id]: 'Solo se permiten archivos PDF' }));
      e.target.value = '';
      return;
    }
    setDatos((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), ...elegidos] }));
    setErrores((prev) => {
      if (!prev[id]) return prev;
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
    e.target.value = '';
  };

  const handleQuitarAnexo = (id) => (indice) => {
    setDatos((prev) => ({ ...prev, [id]: (prev[id] ?? []).filter((_, i) => i !== indice) }));
  };

  const handleCampoChange = (campo) => (e) => {
    if (campo.tipo === 'moneda') return handleDatoMoneda(campo.id)(e);
    if (campo.tipo === 'fotos') return handleFotos(campo.id)(e);
    if (campo.tipo === 'anexos') return handleAnexos(campo.id)(e);
    if (campo.tipo === 'fecha') return handleDatoFecha(campo.id)(e);
    if (campo.tipo === 'check' || campo.tipo === 'switch') {
      const marcado = e.target.checked;
      setDatos((prev) => {
        const copia = { ...prev, [campo.id]: marcado };
        limpiarDependientes(campo.id, marcado, copia, {});
        return copia;
      });
      setErrores((prev) => {
        if (!prev[campo.id]) return prev;
        const copia = { ...prev };
        delete copia[campo.id];
        limpiarDependientes(campo.id, marcado, {}, copia);
        return copia;
      });
      return;
    }
    return handleDato(campo.id)(e);
  };

  const handleLimpiar = () => {
    setCategoria('');
    setTipoDoc('');
    setDatos({});
    setCampoEnfocado(null);
    setAgregarDestinatario(false);
    setErrores({});
  };

  const handleCheckDestinatario = (e) => {
    const marcado = e.target.checked;
    setAgregarDestinatario(marcado);
    if (!marcado) {
      setDatos((prev) => {
        const copia = { ...prev };
        delete copia.destinatario;
        return copia;
      });
      setErrores((prev) => {
        const copia = { ...prev };
        delete copia.destinatario;
        return copia;
      });
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nuevosErrores = {};
    if (categoria === '') nuevosErrores.categoria = 'Seleccione la categoría';
    if (tipoDoc === '') nuevosErrores.tipoDoc = 'Seleccione el tipo de documento';
    camposVisibles.forEach((c) => {
      const valor = datos[c.id];
      if (c.tipo === 'fotos') {
        if (c.requerido && (!Array.isArray(valor) || valor.length === 0)) {
          nuevosErrores[c.id] = 'Agregue al menos una foto';
        }
      } else if (c.tipo === 'anexos') {
        if (c.requerido && (!Array.isArray(valor) || valor.length === 0)) {
          nuevosErrores[c.id] = 'Agregue al menos un anexo PDF';
        }
      } else if (c.tipo === 'check' || c.tipo === 'switch') {
        if (c.requerido && !valor) {
          nuevosErrores[c.id] = 'Debe aceptar esta opción';
        }
      } else if (c.tipo === 'fecha') {
        if (c.requerido && !(valor ?? '').toString().trim()) {
          nuevosErrores[c.id] = 'Este campo es obligatorio';
        } else if ((valor ?? '').toString().trim() && !esFechaValida(valor)) {
          nuevosErrores[c.id] = 'Fecha inválida (dd/mm/aaaa)';
        }
      } else if (c.tipo === 'moneda') {
        if (c.requerido && !(valor ?? '').toString().trim()) {
          nuevosErrores[c.id] = 'Este campo es obligatorio';
        } else if ((valor ?? '').toString().trim() && Number.isNaN(Number(valor))) {
          nuevosErrores[c.id] = 'Monto inválido';
        }
      } else if (c.requerido && !(valor ?? '').toString().trim()) {
        nuevosErrores[c.id] = 'Este campo es obligatorio';
      }
      if (c.tipo === 'email' && (valor ?? '').toString().trim()) {
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
        if (!ok) nuevosErrores[c.id] = 'Correo inválido';
      }
    });
    if (mostrarDestinatario && agregarDestinatario && !(datos.destinatario ?? '').toString().trim()) {
      nuevosErrores.destinatario = 'Este campo es obligatorio';
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;
    setResumenAbierto(true);
  };

  const campoPorId = (id) => campos.find((c) => c.id === id);
  const renderCampo = (campo) => (
    <CampoFormulario
      campo={campo}
      valor={datos[campo.id]}
      error={errores[campo.id]}
      ayudaVisible={campoEnfocado === campo.id}
      onChange={handleCampoChange(campo)}
      onFocus={() => setCampoEnfocado(campo.id)}
      onBlur={() => setCampoEnfocado(null)}
      onQuitarAnexo={campo.tipo === 'anexos' ? handleQuitarAnexo(campo.id) : undefined}
    />
  );
  const renderGrupo = (ids) => ids
    .map(campoPorId)
    .filter(Boolean)
    .filter(esVisible)
    .map((campo) => (
      <Box
        key={campo.id}
        sx={(campo.tipo === 'area' || campo.tipo === 'fotos' || campo.tipo === 'anexos')
          ? { gridColumn: { xs: 'auto', md: '1 / -1' } }
          : undefined}
      >
        {renderCampo(campo)}
      </Box>
    ));

  return (
    <Box id="Box-GenerarCarta-Contenedor" sx={{ m: 0, p: 2, width: '100%' }}>
      <PageHeader
        id="Box-GenerarCarta-Encabezado"
        titulo="Generar notificación legal"
        subtitulo="Seleccione la categoría, el tipo de documento y capture sus datos."
      />

      <Box id="Box-GenerarCarta-Form" component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>

        <SelectorCategoriaTipo
          categoria={categoria}
          tipoDoc={tipoDoc}
          categorias={CATEGORIAS}
          tiposDisponibles={tiposDisponibles}
          errores={errores}
          onCategoria={handleCategoria}
          onTipo={handleTipo}
        />

        {tipoDoc !== '' && (
          <Box id="Box-GenerarCarta-Datos" sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2.5 }} />
            <Typography variant="h5" fontWeight="bold" color="encabezado.main" sx={{ mb: 1 }}>
              Datos para: {nombreTipo(categoria, tipoDoc)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Complete la información con la que se generará el documento.
            </Typography>

            {mostrarDestinatario && (
              <DestinatarioOpcional
                marcado={agregarDestinatario}
                valor={datos.destinatario}
                error={errores.destinatario}
                onCheck={handleCheckDestinatario}
                onChange={handleDato('destinatario')}
              />
            )}

            <Box sx={{
              display: 'grid',
              gap: 3,
              mt: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            }}>
              {tipoDoc === 'carta-responsiva' ? (
                <>
                  <SeccionFormulario titulo="Datos de las personas" columnas={4}>
                    {renderGrupo(['quienEntrega', 'tipoIdEntrega', 'folioEntrega', 'puestoEntrega', 'quienRecibe', 'tipoIdRecibe', 'folioRecibe'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Datos del bien" columnas={3}>
                    {renderGrupo(['tipoBien', 'descripcion', 'marca', 'modelo', 'noSerie', 'estadoFisico', 'especifiqueDetalles', 'valorEstimado', 'fotos'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Condiciones y préstamo" columnas={3}>
                    {renderGrupo(['condiciones', 'lugar', 'fecha'])}
                  </SeccionFormulario>
                </>
              ) : tipoDoc === 'carta-renuncia' ? (
                <>
                  <SeccionFormulario titulo="Datos del empleado" columnas={2}>
                    {renderGrupo(['empleado', 'numeroEmpleado', 'puesto', 'empresa'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Detalles de la renuncia" columnas={2}>
                    {renderGrupo(['ultimoDia', 'motivo', 'especifiqueMotivo'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Lugar y fecha" columnas={2}>
                    {renderGrupo(['lugar', 'fecha'])}
                  </SeccionFormulario>
                </>
              ) : tipoDoc === 'carta-poder' ? (
                <>
                  <SeccionFormulario titulo="Datos del otorgante" columnas={3}>
                    {renderGrupo(['otorgante', 'tipoDocOtorgante', 'idOtorgante'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Datos del apoderado" columnas={3}>
                    {renderGrupo(['apoderado', 'tipoDocApoderado', 'idApoderado'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Objeto y límites del poder" columnas={1}>
                    {renderGrupo(['facultades', 'limites'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Testigos" columnas={3}>
                    {renderGrupo(['testigo1Nombre', 'testigo1TipoDoc', 'testigo1Id', 'testigo2Nombre', 'testigo2TipoDoc', 'testigo2Id'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Vigencia y firma" columnas={3}>
                    {renderGrupo(['vigencia', 'lugar', 'fecha'])}
                  </SeccionFormulario>
                </>
              ) : tipoDoc === 'carta-intencion' ? (
                <>
                  <SeccionFormulario titulo="Parte Emisora (Quien propone)" columnas={2}>
                    {renderGrupo(['emisoraNombre', 'emisoraTipoId', 'emisoraFolio', 'emisoraRepresentante'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Parte Receptora (Con quien se acuerda)" columnas={2}>
                    {renderGrupo(['receptoraNombre', 'receptoraTipoId', 'receptoraFolio', 'receptoraRepresentante'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Detalles del Acuerdo" columnas={2}>
                    {renderGrupo(['objeto', 'confidencialidad', 'vinculante'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Cierre y Jurisdicción" columnas={3}>
                    {renderGrupo(['vigencia', 'lugar', 'fecha'])}
                  </SeccionFormulario>
                </>
              ) : tipoDoc === 'oficio-peticion' ? (
                <>
                  <SeccionFormulario titulo="Destinatario" columnas={3}>
                    {renderGrupo(['nombreDestinatario', 'cargoDestinatario', 'dependenciaDestinatario'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Remitente" columnas={2}>
                    {renderGrupo(['nombreRemitente', 'cargoRemitente'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Contenido de la petición" columnas={2}>
                    {renderGrupo(['folio', 'asunto', 'peticion', 'ccp', 'ccpDetalle', 'anexos', 'fundamentarArt8'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Lugar y fecha" columnas={2}>
                    {renderGrupo(['lugar', 'fecha'])}
                  </SeccionFormulario>
                </>
              ) : tipoDoc === 'oficio-comision' ? (
                <>
                  <SeccionFormulario titulo="Comisionado" columnas={3}>
                    {renderGrupo(['nombreComisionado', 'cargoComisionado', 'numeroEmpleadoComisionado'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Detalles de la comisión" columnas={2}>
                    {renderGrupo(['folio', 'destino', 'fechaInicio', 'fechaFin', 'motivo'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Quien comisiona" columnas={2}>
                    {renderGrupo(['nombreAutoriza', 'cargoAutoriza'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Viáticos" columnas={2}>
                    {renderGrupo(['viaticos', 'montoViaticos'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Lugar y fecha de emisión" columnas={2}>
                    {renderGrupo(['lugar', 'fecha'])}
                  </SeccionFormulario>
                </>
              ) : tipoDoc === 'oficio-resolucion' ? (
                <>
                  <SeccionFormulario titulo="Destinatario" columnas={2}>
                    {renderGrupo(['nombreDestinatario', 'cargoDestinatario'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Antecedentes y datos generales" columnas={2}>
                    {renderGrupo(['folio', 'referenciaOrigen', 'interesado', 'asunto', 'sentido'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Considerandos" columnas={1}>
                    {renderGrupo(['considerandos'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Puntos resolutivos" columnas={1}>
                    {renderGrupo(['puntosResolutivos'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Autoridad que resuelve" columnas={2}>
                    {renderGrupo(['nombreResuelve', 'cargoResuelve'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Lugar y fecha" columnas={2}>
                    {renderGrupo(['lugar', 'fecha'])}
                  </SeccionFormulario>
                </>
              ) : tipoDoc === 'aviso-privacidad' ? (
                <>
                  <SeccionFormulario titulo="Responsable" columnas={3}>
                    {renderGrupo(['razonSocial', 'domicilio', 'tipoAviso'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Datos y finalidad" columnas={1}>
                    {renderGrupo(['datosRecabados', 'finalidad'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Transferencia" columnas={2}>
                    {renderGrupo(['transferencia', 'transferenciaDetalle'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Contacto y fecha" columnas={2}>
                    {renderGrupo(['contactoArco', 'fecha'])}
                  </SeccionFormulario>
                </>
              ) : tipoDoc === 'aviso-rescision' ? (
                <>
                  <SeccionFormulario titulo="Trabajador" columnas={3}>
                    {renderGrupo(['trabajador', 'numeroEmpleado', 'puesto'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Causa y fundamento" columnas={1}>
                    {renderGrupo(['causa', 'fundamentoLegal'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Representante" columnas={2}>
                    {renderGrupo(['nombreRepresentante', 'cargoRepresentante'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Lugar y fecha" columnas={3}>
                    {renderGrupo(['lugar', 'fechaRescision', 'fecha'])}
                  </SeccionFormulario>
                </>
              ) : tipoDoc === 'aviso-funcionamiento' ? (
                <>
                  <SeccionFormulario titulo="Autoridad y establecimiento" columnas={2}>
                    {renderGrupo(['autoridadDestino', 'establecimiento', 'rfc', 'giro'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Domicilio y responsable" columnas={3}>
                    {renderGrupo(['domicilio', 'responsable', 'horario'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Fechas" columnas={2}>
                    {renderGrupo(['fechaApertura', 'fecha'])}
                  </SeccionFormulario>
                </>
              ) : tipoDoc === 'notificacion-general' ? (
                <>
                  <SeccionFormulario titulo="Destinatario" columnas={3}>
                    {renderGrupo(['destinatario', 'domicilio', 'expediente'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Quien notifica" columnas={2}>
                    {renderGrupo(['nombreNotifica', 'cargoNotifica'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Contenido" columnas={1}>
                    {renderGrupo(['extracto'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Acuse de recibo" columnas={1}>
                    {renderGrupo(['acuseRecibo'])}
                  </SeccionFormulario>
                  <SeccionFormulario titulo="Lugar y fecha" columnas={2}>
                    {renderGrupo(['lugar', 'fecha'])}
                  </SeccionFormulario>
                </>
              ) : (
                camposVisibles.map((campo) => (
                  <Box
                    key={campo.id}
                    sx={(campo.tipo === 'area' || campo.tipo === 'fotos' || campo.tipo === 'anexos')
                      ? { gridColumn: { xs: 'auto', md: '1 / -1' } }
                      : undefined}
                  >
                    {renderCampo(campo)}
                  </Box>
                ))
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button type="submit" variant="contained" color="primary">
                Generar documento
              </Button>
              <Button variant="outlined" color="primary" onClick={handleLimpiar} sx={{ borderColor: 'encabezado.main', color: 'encabezado.main' }}>
                Limpiar
              </Button>
            </Box>
          </Box>
        )}

      </Box>

      <ResumenDocumento
        abierto={resumenAbierto}
        categoriaNombre={nombreCategoria(categoria)}
        tipoNombre={nombreTipo(categoria, tipoDoc)}
        mostrarDestinatario={mostrarDestinatario}
        agregarDestinatario={agregarDestinatario}
        destinatarioValor={datos.destinatario}
        campos={camposVisibles}
        datos={datos}
        onCerrar={() => setResumenAbierto(false)}
      />

    </Box>
  );
}

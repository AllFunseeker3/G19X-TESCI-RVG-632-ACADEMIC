// ============================================================================
// ARCHIVO: src/Pages/GenerarCarta.jsx
// FUNCIÓN GENERAL: formulario dinámico para generar documentos legales.
//   Campo 1 categoría -> Campo 2 tipo -> campos según tiposDocumentos.js.
// FLUJO:
//   - ENTRAN: lib/tiposDocumentos.js (CATEGORIAS, tipos, campos con mostrarSi).
//   - PASO 1: ResumenDocumento.jsx verifica datos -> PASO 2: preview IA
//     (solo lectura + retro) -> PASO 3: Confirmar guarda doc + PDF.
// QUÉ MODIFICAR SI hay cambios: Box por tipo abajo; mostrarDestinatario excluye
//   9 tipos con destinatario fijo; solo id==='fecha' lleva hoy auto.
// ============================================================================
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Button, Divider, Alert, TextField, Autocomplete, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  CATEGORIAS, tiposDeCategoria, nombreCategoria,
  nombreTipo, camposDeTipo, categoriaDeTipo,
} from '../lib/tiposDocumentos';
import { crearDocumento, actualizarDocumento, getDocumento, getClientes, descargarPDF, generarPDF, redactarConIA, corregirConIA } from '../lib/api.js';
import PageHeader from '../Components/PageHeader';
import ProgresoIA from '../Components/ProgresoIA';
import CampoFormulario, { esFechaValida, formatearHoyDDMMAAAA } from '../Components/CampoFormulario';
import SeccionFormulario from '../Components/SeccionFormulario';
import SelectorCategoriaTipo from '../Components/SelectorCategoriaTipo';
import DestinatarioOpcional from '../Components/DestinatarioOpcional';
import ResumenDocumento from '../Components/ResumenDocumento';

// Mapa cliente -> campo nombre por tipo (autorrelleno). Solo rellena vacíos.
// carta-renuncia es especial: persona->empleado, empresa->empresa.
// oficio-comision no tiene contraparte: solo vincula id_cliente.
const MAPA_CLIENTE_NOMBRE = {
  'carta-poder': ['destinatario'],
  'carta-responsiva': ['quienRecibe'],
  'carta-intencion': ['receptoraNombre'],
  'oficio-peticion': ['nombreDestinatario'],
  'oficio-resolucion': ['interesado'],
  'aviso-privacidad': ['razonSocial'],
  'aviso-rescision': ['trabajador'],
  'aviso-funcionamiento': ['establecimiento'],
  'notificacion-general': ['destinatario'],
};

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
  // ============ AQUÍ EMPIEZA ESTADOS FORMULARIO ============
  // Selección (categoría/tipo), datos capturados, UI (resumen, foco, errores) e IA.
  const [categoria, setCategoria] = useState('');
  const [tipoDoc, setTipoDoc] = useState('');
  const [datos, setDatos] = useState({});
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [campoEnfocado, setCampoEnfocado] = useState(null);
  const [agregarDestinatario, setAgregarDestinatario] = useState(false);
  const [errores, setErrores] = useState({});
  const [params] = useSearchParams();
  const [claveAplicada, setClaveAplicada] = useState('');
  // IA: redacción automática (piloto: solo carta-poder).
  const [iaAbierto, setIaAbierto] = useState(false);
  const [iaTexto, setIaTexto] = useState('');
  const [iaModelo, setIaModelo] = useState('');
  const [iaCargando, setIaCargando] = useState(false);
  const [iaError, setIaError] = useState('');
  const [iaRetro, setIaRetro] = useState(''); // Retro del usuario: qué corregir del texto
  const [iaCorrigiendo, setIaCorrigiendo] = useState(false); // Corrigiendo con IA en curso
  const [guardado, setGuardado] = useState(null); // { id, archivo, folio } del documento + PDF
  const [guardando, setGuardando] = useState(false); // Confirmar está creando doc + PDF
  const [errorGuardar, setErrorGuardar] = useState('');
  // Progreso por fases (estimado por timer: el back es 1 petición sin eventos).
  const [iaFases, setIaFases] = useState([]);
  const [iaFase, setIaFase] = useState(0);
  const [iaProgreso, setIaProgreso] = useState(0);
  const [iaSegundos, setIaSegundos] = useState(0);
  const progresoTimer = useRef(null);
  // Modo corrección (?editar=id): precarga un documento en revisión o rechazado propio.
  const [editandoId, setEditandoId] = useState(null);
  const [editandoMotivo, setEditandoMotivo] = useState('');
  const [editandoCargando, setEditandoCargando] = useState(false);
  // Cliente existente (directorio): lista + seleccionado para autorrelleno.
  const [clientes, setClientes] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);
  // ============ AQUÍ TERMINA ESTADOS FORMULARIO ============

  // ============ AQUÍ EMPIEZA SINCRONIZACIÓN POR URL ============
  // Precarga categoría/tipo desde ?categoria=&tipo= (lo manda plantillas.jsx).
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

  // ============ AQUÍ TERMINA SINCRONIZACIÓN POR URL ============

  // ============ AQUÍ EMPIEZA MODO CORRECCIÓN ?editar= ============
  // Precarga categoría/tipo/datos del documento a corregir (una sola vez).
  // El motivo del rechazo (si hay) se muestra como banner para guiar la corrección.
  useEffect(() => {
    const id = params.get('editar');
    if (!id || editandoId === Number(id)) return;
    let vivo = true;
    (async () => {
      setEditandoCargando(true);
      try {
        const det = await getDocumento(id);
        if (!vivo) return;
        const cat = categoriaDeTipo(det.id_tipo);
        if (!cat) throw new Error('Tipo de documento desconocido');
        setCategoria(cat);
        setTipoDoc(det.id_tipo);
        setDatos(det.datos ?? {});
        setAgregarDestinatario(Boolean((det.datos ?? {}).destinatario));
        setErrores({});
        setEditandoId(det.id_documento ?? det.id);
        const ultimoRechazo = (Array.isArray(det.historial) ? det.historial : [])
          .filter((h) => h.estado_nuevo === 'rechazado').slice(-1)[0];
        setEditandoMotivo(ultimoRechazo?.comentario ?? '');
        setErrorGuardar('');
      } catch (e) {
        if (vivo) setErrorGuardar(e.message || 'No se pudo cargar el documento a corregir');
      } finally {
        if (vivo) setEditandoCargando(false);
      }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  // ============ AQUÍ TERMINA MODO CORRECCIÓN ?editar= ============

  // ============ AQUÍ EMPIEZA CLIENTE EXISTENTE ============
  // Directorio para autorrelleno (una carga al montar).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const lista = await getClientes();
        if (vivo) setClientes(Array.isArray(lista) ? lista : []);
      } catch {
        if (vivo) setClientes([]);
      }
    })();
    return () => { vivo = false; };
  }, []);

  // En modo ?editar=, el vinculado se deriva de datos + lista (sin efecto).
  const clienteMostrado = clienteSel
    ?? (datos.id_cliente ? (clientes.find((c) => c.id === datos.id_cliente) ?? null) : null);

  // Aplica el cliente: vincula id_cliente + rellena vacíos según el tipo.
  // Al limpiar (null) solo desvincula; conserva lo ya escrito.
  const aplicarCliente = (cli) => {
    if (!cli) {
      setClienteSel(null);
      setDatos((prev) => {
        const copia = { ...prev };
        delete copia.id_cliente;
        return copia;
      });
      return;
    }
    setClienteSel(cli);
    const ids = new Set(camposDeTipo(tipoDoc).map((c) => c.id));
    // 'destinatario' vive en el checkbox opcional (no en camposDeTipo).
    const conDestinatario = tipoDoc !== '' && !TIPOS_SIN_DESTINATARIO_OPCIONAL.has(tipoDoc);
    const existe = (f) => (f === 'destinatario' ? conDestinatario : ids.has(f));
    const vacio = (v) => !(v ?? '').toString().trim();
    setDatos((prev) => {
      const copia = { ...prev, id_cliente: cli.id };
      let destinos = MAPA_CLIENTE_NOMBRE[tipoDoc] ?? [];
      if (tipoDoc === 'carta-renuncia') {
        destinos = cli.tipo_cliente === 'fisica' ? ['empleado'] : ['empresa'];
      }
      for (const f of destinos) {
        if (existe(f) && vacio(copia[f])) { copia[f] = cli.nombre; break; }
      }
      if (ids.has('domicilio') && vacio(copia.domicilio) && cli.domicilio) {
        copia.domicilio = cli.domicilio;
      }
      if (ids.has('rfc') && vacio(copia.rfc) && cli.tipo_cliente === 'moral' && cli.rfc) {
        copia.rfc = cli.rfc;
      }
      return copia;
    });
    setErrores((prev) => {
      const copia = { ...prev };
      delete copia.id_cliente;
      return copia;
    });
    if ((tipoDoc === 'carta-poder' || tipoDoc === 'carta-intencion')
      && (MAPA_CLIENTE_NOMBRE[tipoDoc] ?? []).includes('destinatario')) {
      setAgregarDestinatario(true);
    }
  };
  // ============ AQUÍ TERMINA CLIENTE EXISTENTE ============

  // ============ AQUÍ EMPIEZA CAMPOS VISIBLES ============
  // Tipos y campos del catálogo filtrados por mostrarSi y destinatario opcional.
  const tiposDisponibles = tiposDeCategoria(categoria);
  const campos = camposDeTipo(tipoDoc);

  const esVisible = (campo) => {
    if (!campo.mostrarSi) return true;
    const actual = datos[campo.mostrarSi.campo];
    return actual === campo.mostrarSi.valor;
  };
  const camposVisibles = campos.filter(esVisible);
  const mostrarDestinatario = tipoDoc !== '' && !TIPOS_SIN_DESTINATARIO_OPCIONAL.has(tipoDoc);
  // ============ AQUÍ TERMINA CAMPOS VISIBLES ============

  // ============ AQUÍ EMPIEZA LIMPIEZA DEPENDIENTES ============
  // Borra datos/errores hijos cuando el padre cambia (ej. motivo != Otro).
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
  // ============ AQUÍ TERMINA LIMPIEZA DEPENDIENTES ============

  // ============ AQUÍ EMPIEZA HANDLERS CATEGORÍA Y TIPO ============
  // Reinician tipo/datos/errores al cambiar la selección principal.
  const handleCategoria = (e) => {
    setCategoria(e.target.value);
    setTipoDoc('');
    setDatos({});
    setClienteSel(null);
    setCampoEnfocado(null);
    setAgregarDestinatario(false);
    setErrores({});
  };

  const handleTipo = (e) => {
    const t = e.target.value;
    setTipoDoc(t);
    setDatos(datosInicialesPorTipo(camposDeTipo(t)));
    setClienteSel(null);
    setCampoEnfocado(null);
    setAgregarDestinatario(false);
    setErrores({});
  };
  // ============ AQUÍ TERMINA HANDLERS CATEGORÍA Y TIPO ============

  // ============ AQUÍ EMPIEZA HANDLERS DE DATOS ============
  // Actualizan `datos` por tipo de campo y limpian su error al escribir.
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
  // ============ AQUÍ TERMINA HANDLERS DE DATOS ============

  // ============ AQUÍ EMPIEZA LIMPIAR Y DESTINATARIO ============
  // Reinician el formulario o quitan el destinatario opcional.
  const handleLimpiar = () => {
    setCategoria('');
    setTipoDoc('');
    setDatos({});
    setClienteSel(null);
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
  // ============ AQUÍ TERMINA LIMPIAR Y DESTINATARIO ============

  // ============ AQUÍ EMPIEZA VALIDACIÓN Y SUBMIT ============
  // Revisa requeridos/formatos y abre el resumen solo si no hay errores.
  const validar = () => {
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
    return nuevosErrores;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Paso 1: valida y abre el Resumen para verificar datos antes de redactar.
    const nuevosErrores = validar();
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;
    setErrorGuardar('');
    setResumenAbierto(true);
  };
  // ============ AQUÍ TERMINA VALIDACIÓN Y SUBMIT ============

  // ============ AQUÍ EMPIEZA SERIALIZACIÓN E IA ============
  // Convierte datos a JSON seguro (File[] de fotos/anexos -> nombres).
  const datosSerializables = () => {
    const plano = {};
    Object.entries(datos).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        plano[k] = v.map((a) => (typeof a === 'string' ? a : a?.name ?? ''));
      } else {
        plano[k] = v;
      }
    });
    return plano;
  };

  // ============ AQUÍ EMPIEZA PROGRESO ESTIMADO IA ============
  // El back es una petición HTTP sin progreso real: se estima 0→90% por timer
  // y se completa a 100% al resolver. Fases textuales por operación.
  const detenerProgreso = () => {
    if (progresoTimer.current) clearInterval(progresoTimer.current);
    progresoTimer.current = null;
  };
  const iniciarProgreso = (fases, estimadoSeg = 60) => {
    detenerProgreso();
    setIaFases(fases);
    setIaFase(0);
    setIaProgreso(2);
    setIaSegundos(0);
    const t0 = Date.now();
    progresoTimer.current = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      setIaSegundos(Math.floor(s));
      setIaProgreso(Math.min(90, 2 + (s / estimadoSeg) * 88));
      setIaFase(Math.min(fases.length - 1, Math.floor((s / estimadoSeg) * fases.length)));
    }, 500);
  };
  // Limpia el timer al desmontar.
  useEffect(() => () => detenerProgreso(), []);
  // ============ AQUÍ TERMINA PROGRESO ESTIMADO IA ============

  // Paso 2: desde el Resumen verificado se redacta con IA (11 tipos).
  const handleConfirmarDatosParaIA = async () => {
    setResumenAbierto(false);
    setIaError('');
    setIaTexto('');
    setIaRetro('');
    setIaCargando(true);
    setIaAbierto(true);
    const esPoder = tipoDoc === 'carta-poder';
    iniciarProgreso(
      esPoder
        ? ['Conectando con IA', 'Formalizando lenguaje jurídico', 'Redactando documento', 'Recibiendo texto']
        : ['Conectando con IA', 'Redactando documento', 'Recibiendo texto'],
      esPoder ? 75 : 50,
    );
    try {
      const r = await redactarConIA(tipoDoc, datosSerializables());
      setIaTexto(r.contenido ?? '');
      setIaModelo(r.modelo ?? '');
      setIaProgreso(100);
      setIaFase(esPoder ? 3 : 2);
    } catch (e) {
      setIaError(e.message || 'No se pudo redactar');
    } finally {
      detenerProgreso();
      setIaCargando(false);
    }
  };

  // Retro: corrige el texto del preview con la IA (conserva formato, solo aplica la instrucción).
  const handleCorregirIA = async () => {
    if (!iaTexto || !(iaRetro ?? '').trim() || iaCorrigiendo) return;
    setIaError('');
    setIaCorrigiendo(true);
    iniciarProgreso(['Enviando corrección', 'Aplicando cambios con IA', 'Recibiendo texto corregido'], 45);
    try {
      const r = await corregirConIA(iaTexto, iaRetro.trim(), tipoDoc);
      setIaTexto(r.contenido ?? '');
      if (r.modelo) setIaModelo(r.modelo);
      setIaRetro('');
      setIaProgreso(100);
      setIaFase(2);
    } catch (e) {
      setIaError(e.message || 'No se pudo corregir');
    } finally {
      detenerProgreso();
      setIaCorrigiendo(false);
    }
  };

  // Paso 3b: Volver del preview IA al Resumen para corregir datos.
  const handleVolverADatos = () => {
    if (iaCargando || iaCorrigiendo || guardando) return;
    setIaAbierto(false);
    setResumenAbierto(true);
  };

  // Paso 4: CONFIRMAR final desde el preview IA crea el documento + PDF.
  // En modo ?editar= actualiza el documento (vuelve a revisión) en vez de crear.
  const handleGuardarFinal = async () => {
    if (iaCargando || !iaTexto || guardando) return;
    setErrorGuardar('');
    setGuardando(true);
    iniciarProgreso(editandoId
      ? ['Guardando corrección', 'Generando PDF institucional']
      : ['Guardando en revisión', 'Generando PDF institucional'], 20);
    try {
      // El back genera el folio automático (PREFIJO-AAAA-NNN) y lo devuelve.
      let idDoc = editandoId;
      let folioDoc = null;
      if (editandoId) {
        const act = await actualizarDocumento(editandoId, {
          datos: datosSerializables(),
          id_cliente: datos.id_cliente ?? null,
          ...(iaTexto ? { contenido: iaTexto, modelo_ia: iaModelo } : {}),
        });
        folioDoc = act.folio ?? null;
      } else {
        const creado = await crearDocumento({
          id_tipo: tipoDoc,
          datos: datosSerializables(),
          id_cliente: datos.id_cliente ?? null,
          ...(iaTexto ? { contenido: iaTexto, modelo_ia: iaModelo } : {}),
        });
        idDoc = creado.id;
        folioDoc = creado.folio ?? null;
      }
      setIaFase(1);
      setIaProgreso(60);
      let archivo = null;
      try {
        const pdf = await generarPDF(tipoDoc, datosSerializables(), idDoc, iaTexto || '');
        archivo = pdf.archivo ?? null;
      } catch (ePdf) {
        setErrorGuardar(`Documento #${idDoc} guardado, pero el PDF falló: ${ePdf.message}`);
      }
      setGuardado({ id: idDoc, archivo, folio: folioDoc });
      setIaProgreso(100);
      setIaAbierto(false);
    } catch (e) {
      setErrorGuardar(e.message || 'No se pudo guardar');
    } finally {
      detenerProgreso();
      setGuardando(false);
    }
  };

  // Descarga el PDF generado (Blob autenticado -> download).
  const handleDescargarPDF = async () => {
    if (!guardado?.archivo) return;
    try {
      const blob = await descargarPDF(guardado.archivo);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = guardado.archivo;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      /* descarga no disponible */
    }
  };
  // ============ AQUÍ TERMINA SERIALIZACIÓN E IA ============

  // ============ AQUÍ EMPIEZA RENDER HELPERS ============
  // Resuelven campos por id y los pintan (area/fotos/anexos a ancho completo).
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

  // ============ AQUÍ TERMINA RENDER HELPERS ============

  return (
    // ============ AQUÍ EMPIEZA CONTENEDOR GENERAR CARTA ============
    <Box id="Box-GenerarCarta-Contenedor" sx={{ m: 0, p: 2, width: '100%' }}>
      {/* ============ AQUÍ EMPIEZA ENCABEZADO GENERAR CARTA ============ */}
      <PageHeader
        id="Box-GenerarCarta-Encabezado"
        titulo={editandoId ? `Corregir documento #${editandoId}` : 'Generar notificación legal'}
        subtitulo={editandoId
          ? 'Corrige los datos observados y vuelve a generar: el documento regresa a revisión.'
          : 'Seleccione la categoría, el tipo de documento y capture sus datos.'}
      />
      {/* ============ AQUÍ TERMINA ENCABEZADO GENERAR CARTA ============ */}

      {/* ============ AQUÍ EMPIEZA BANNER MODO CORRECCIÓN ============ */}
      {editandoCargando && (
        <Alert severity="info" sx={{ mt: 2 }}>Cargando documento a corregir…</Alert>
      )}
      {editandoMotivo && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Motivo del rechazo: {editandoMotivo}
        </Alert>
      )}
      {/* ============ AQUÍ TERMINA BANNER MODO CORRECCIÓN ============ */}

      {/* ============ AQUÍ EMPIEZA FORMULARIO GENERAR CARTA ============ */}
      <Box id="Box-GenerarCarta-Form" component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>

        {/* ============ AQUÍ EMPIEZA SELECTOR CATEGORÍA Y TIPO ============ */}
        <SelectorCategoriaTipo
          categoria={categoria}
          tipoDoc={tipoDoc}
          categorias={CATEGORIAS}
          tiposDisponibles={tiposDisponibles}
          errores={errores}
          onCategoria={handleCategoria}
          onTipo={handleTipo}
        />
        {/* ============ AQUÍ TERMINA SELECTOR CATEGORÍA Y TIPO ============ */}

        {tipoDoc !== '' && (
          // ============ AQUÍ EMPIEZA DATOS DEL DOCUMENTO ============
          <Box id="Box-GenerarCarta-Datos" sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2.5 }} />
            <Typography variant="h5" fontWeight="bold" color="encabezado.main" sx={{ mb: 1 }}>
              Datos para: {nombreTipo(categoria, tipoDoc)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Complete la información con la que se generará el documento.
            </Typography>

            {/* ============ AQUÍ EMPIEZA CLIENTE EXISTENTE ============ */}
            {/* Autocompletado opcional: vincula id_cliente + rellena vacíos. */}
            <Autocomplete
              options={clientes}
              value={clienteMostrado}
              onChange={(_, v) => aplicarCliente(v)}
              getOptionLabel={(c) => (typeof c === 'string' ? c : `${c.nombre} — ${c.tipo_cliente === 'fisica' ? 'Persona' : 'Empresa'}`)}
              isOptionEqualToValue={(a, b) => a?.id === b?.id}
              renderOption={(props, c) => (
                <li {...props} key={c.id}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2">{c.nombre}</Typography>
                    <Chip size="small" label={c.tipo_cliente === 'fisica' ? 'Persona' : 'Empresa'} />
                    {!c.verificado && <Chip size="small" label="Sin verificar" color="warning" />}
                  </Box>
                </li>
              )}
              renderInput={(p) => (
                <TextField
                  {...p}
                  label="Cliente existente (opcional)"
                  helperText="Autocompleta nombre, domicilio y RFC con un cliente del directorio."
                  variant="standard"
                />
              )}
              sx={{ mb: 2, maxWidth: 560 }}
            />
            {clienteMostrado && !clienteMostrado.verificado && (
              <Alert severity="warning" sx={{ mb: 2, maxWidth: 560 }}>
                Cliente sin verificar por un admin o super. Revisa bien los datos antes de generar.
              </Alert>
            )}
            {/* ============ AQUÍ TERMINA CLIENTE EXISTENTE ============ */}

            {mostrarDestinatario && (
              <DestinatarioOpcional
                marcado={agregarDestinatario}
                valor={datos.destinatario}
                error={errores.destinatario}
                onCheck={handleCheckDestinatario}
                onChange={handleDato('destinatario')}
              />
            )}

            {/* ============ AQUÍ EMPIEZA GRID CAMPOS POR TIPO ============ */}
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
            {/* ============ AQUÍ TERMINA GRID CAMPOS POR TIPO ============ */}

            {/* ============ AQUÍ EMPIEZA ALERTA GUARDADO ============ */}
            {guardado && (
              <Alert severity="success" sx={{ mt: 2 }} onClose={() => setGuardado(null)}>
                Documento #{guardado.id}{guardado.folio ? ` (folio ${guardado.folio})` : ''} {editandoId ? 'corregido (regresó a revisión con redacción IA' : 'guardado en revisión (con redacción IA'}
                {guardado.archivo ? ' y PDF' : ''}).
                {guardado.archivo && (
                  <Button size="small" onClick={handleDescargarPDF} sx={{ ml: 1, color: 'encabezado.main' }}>
                    Descargar PDF
                  </Button>
                )}
              </Alert>
            )}
            {/* ============ AQUÍ TERMINA ALERTA GUARDADO ============ */}

            {/* ============ AQUÍ EMPIEZA BOTONES ACCIÓN ============ */}
            <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
              <Button type="submit" variant="contained" color="primary" disabled={iaCargando || guardando}>
                {iaCargando ? 'Redactando...' : 'Generar documento'}
              </Button>
              <Button variant="outlined" color="primary" onClick={handleLimpiar} sx={{ borderColor: 'encabezado.main', color: 'encabezado.main' }}>
                Limpiar
              </Button>
            </Box>
            {/* ============ AQUÍ TERMINA BOTONES ACCIÓN ============ */}
          </Box>
          // ============ AQUÍ TERMINA DATOS DEL DOCUMENTO ============
        )}

      </Box>
      {/* ============ AQUÍ TERMINA FORMULARIO GENERAR CARTA ============ */}

      {/* ============ AQUÍ EMPIEZA RESUMEN DOCUMENTO ============ */}
      {/* Paso 1: verifica datos antes de redactar con IA. */}
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
        onConfirmar={handleConfirmarDatosParaIA}
        guardando={false}
        errorGuardar=""
        textoConfirmar="Redactar"
      />
      {/* ============ AQUÍ TERMINA RESUMEN DOCUMENTO ============ */}

      {/* Preview de la redacción IA (solo lectura + retro para corregir) */}
      {/* ============ AQUÍ EMPIEZA DIÁLOGO IA ============ */}
      <Dialog open={iaAbierto} onClose={() => !iaCargando && !guardando && setIaAbierto(false)} maxWidth="md" fullWidth>
        <DialogTitle color="encabezado.main" fontWeight="bold">
          Generando redacción: {nombreTipo(categoria, tipoDoc)}
        </DialogTitle>
        <DialogContent dividers>
          {(iaCargando || iaCorrigiendo || guardando) && (
            <ProgresoIA
              fases={iaFases}
              indice={iaFase}
              progreso={iaProgreso}
              segundos={iaSegundos}
              modelo={iaModelo}
            />
          )}
          {iaError && (
            <Alert severity="error" sx={{ mb: 2 }}>{iaError}</Alert>
          )}
          {errorGuardar && (
            <Alert severity="error" sx={{ mb: 2 }}>{errorGuardar}</Alert>
          )}
          {iaTexto && (
            <>
              <Typography
                variant="body1"
                sx={{ whiteSpace: 'pre-wrap', mb: 2 }}
              >
                {iaTexto}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Modelo: {iaModelo} · Revisa el texto antes de guardar.
              </Typography>
              <TextField
                label="¿Algo está mal? Describe qué corregir (ej. cambia la vigencia a 1 año, agrega el folio...)"
                multiline
                minRows={2}
                fullWidth
                value={iaRetro}
                onChange={(e) => setIaRetro(e.target.value)}
                disabled={iaCargando || iaCorrigiendo || guardando}
                sx={{ mb: 1 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={handleCorregirIA}
                  disabled={iaCargando || iaCorrigiendo || guardando || !iaTexto || !(iaRetro ?? '').trim()}
                  sx={{ borderColor: 'encabezado.main', color: 'encabezado.main' }}
                >
                  {iaCorrigiendo ? 'Corrigiendo...' : 'Corregir'}
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleVolverADatos} disabled={iaCargando || iaCorrigiendo || guardando} sx={{ color: 'encabezado.main' }}>
            Volver a datos
          </Button>
          <Button onClick={() => setIaAbierto(false)} disabled={iaCargando || iaCorrigiendo || guardando} sx={{ color: 'encabezado.main' }}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGuardarFinal}
            disabled={iaCargando || iaCorrigiendo || guardando || !iaTexto}
          >
            {guardando ? 'Generando...' : 'Confirmar y guardar'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* ============ AQUÍ TERMINA DIÁLOGO IA ============ */}

    </Box>
    // ============ AQUÍ TERMINA CONTENEDOR GENERAR CARTA ============
  );
}

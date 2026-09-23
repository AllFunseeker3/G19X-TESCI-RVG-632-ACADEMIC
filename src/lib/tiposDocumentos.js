// ============================================================================
// ARCHIVO: src/lib/tiposDocumentos.js
// FUNCIÓN GENERAL: catálogo local de documentos legales (Campo 1, Campo 2 y
//   campos por tipo). Espejo de db/sislegal_schema.sql tabla campos_tipo.
// FLUJO DE DATOS:
//   - ENTRAN: "Tipos de documentos legales.txt" (11 tipos, 137 campos).
//   - SALEN: Components/SelectorCategoriaTipo.jsx y CampoFormulario.jsx vía
//     helpers (nombreCategoria, tiposDeCategoria, camposDeTipo).
// QUÉ MODIFICAR SI hay cambios: CATEGORIAS, TIPOS_POR_CATEGORIA o
//   CAMPOS_POR_TIPO aquí mismo (tipos: texto|email|fecha|area|seleccion|
//   moneda|fotos|check|switch|anexos).
// ============================================================================

// ============ AQUÍ EMPIEZA CATEGORIAS (Campo 1) ============
// Campo 1: categoría general (Cartas, Oficios, Avisos, Notificaciones).

export const CATEGORIAS = [
  { id: 'cartas', nombre: 'Cartas' },
  { id: 'oficios', nombre: 'Oficios' },
  { id: 'avisos', nombre: 'Avisos' },
  { id: 'notificaciones', nombre: 'Notificaciones Legales' },
];
// ============ AQUÍ TERMINA CATEGORIAS (Campo 1) ============

// ============ AQUÍ EMPIEZA TIPOS_POR_CATEGORIA (Campo 2) ============
// Subtipos por categoría (Campo 2). Se habilita solo tras elegir Campo 1.
export const TIPOS_POR_CATEGORIA = {
  cartas: [
    { id: 'carta-poder', nombre: 'Carta Poder' },
    { id: 'carta-responsiva', nombre: 'Carta Responsiva' },
    { id: 'carta-renuncia', nombre: 'Carta de Renuncia' },
    { id: 'carta-intencion', nombre: 'Carta de Intención' },
  ],
  oficios: [
    { id: 'oficio-peticion', nombre: 'Oficio de Petición' },
    { id: 'oficio-comision', nombre: 'Oficio de Comisión' },
    { id: 'oficio-resolucion', nombre: 'Oficio de Resolución' },
  ],
  avisos: [
    { id: 'aviso-privacidad', nombre: 'Aviso de Privacidad' },
    { id: 'aviso-rescision', nombre: 'Aviso de Rescisión Laboral' },
    { id: 'aviso-funcionamiento', nombre: 'Aviso de Funcionamiento' },
  ],
  // El txt no define subtipos para Notificaciones Legales:
  // se deja una opción genérica hasta que se definan las plantillas.
  notificaciones: [
    { id: 'notificacion-general', nombre: 'Notificación legal general' },
  ],
};
// ============ AQUÍ TERMINA TIPOS_POR_CATEGORIA (Campo 2) ============

// ============ AQUÍ EMPIEZA CAMPOS_POR_TIPO ============
// Datos que pide cada tipo de documento específico.
export const CAMPOS_POR_TIPO = {
  'carta-poder': [
    { id: 'otorgante', etiqueta: 'Nombre del otorgante', tipo: 'texto', requerido: true, ayuda: 'Ingrese los datos tal como aparecen en la identificación oficial' },
    { id: 'tipoDocOtorgante', etiqueta: 'Tipo de documento de identificación del otorgante', tipo: 'seleccion', requerido: true, opciones: ['INE', 'Pasaporte', 'Cartilla militar', 'Cédula profesional'] },
    { id: 'idOtorgante', etiqueta: 'Folio / número de identificación del otorgante', tipo: 'texto', requerido: true },
    { id: 'apoderado', etiqueta: 'Nombre del apoderado', tipo: 'texto', requerido: true, ayuda: 'Ingrese los datos tal como aparecen en la identificación oficial' },
    { id: 'tipoDocApoderado', etiqueta: 'Tipo de documento de identificación del apoderado', tipo: 'seleccion', requerido: true, opciones: ['INE', 'Pasaporte', 'Cartilla militar', 'Cédula profesional'] },
    { id: 'idApoderado', etiqueta: 'Folio / número de identificación del apoderado', tipo: 'texto', requerido: true },
    { id: 'facultades', etiqueta: 'Facultades / objeto del poder', tipo: 'area', requerido: true },
    { id: 'limites', etiqueta: 'Límites del poder', tipo: 'area', requerido: true },
    { id: 'testigo1Nombre', etiqueta: 'Nombre completo del testigo 1', tipo: 'texto', requerido: true, ayuda: 'Ingrese los datos tal como aparecen en la identificación oficial' },
    { id: 'testigo1TipoDoc', etiqueta: 'Tipo de documento de identificación del testigo 1', tipo: 'seleccion', requerido: true, opciones: ['INE', 'Pasaporte', 'Cartilla militar', 'Cédula profesional'] },
    { id: 'testigo1Id', etiqueta: 'Folio / número de identificación del testigo 1', tipo: 'texto', requerido: true },
    { id: 'testigo2Nombre', etiqueta: 'Nombre completo del testigo 2', tipo: 'texto', requerido: true, ayuda: 'Ingrese los datos tal como aparecen en la identificación oficial' },
    { id: 'testigo2TipoDoc', etiqueta: 'Tipo de documento de identificación del testigo 2', tipo: 'seleccion', requerido: true, opciones: ['INE', 'Pasaporte', 'Cartilla militar', 'Cédula profesional'] },
    { id: 'testigo2Id', etiqueta: 'Folio / número de identificación del testigo 2', tipo: 'texto', requerido: true },
    { id: 'vigencia', etiqueta: 'Vigencia del poder', tipo: 'texto', requerido: false },
    { id: 'lugar', etiqueta: 'Lugar de firma', tipo: 'texto', requerido: true },
    { id: 'fecha', etiqueta: 'Fecha de firma', tipo: 'fecha', requerido: true },
  ],
  'carta-responsiva': [
    { id: 'quienEntrega', etiqueta: 'Nombre de quien entrega', tipo: 'texto', requerido: true },
    { id: 'tipoIdEntrega', etiqueta: 'Tipo de identificación de quien entrega', tipo: 'seleccion', requerido: true, opciones: ['INE', 'Pasaporte', 'Cartilla militar', 'Cédula profesional'] },
    { id: 'folioEntrega', etiqueta: 'Folio / número de identificación de quien entrega', tipo: 'texto', requerido: true },
    { id: 'puestoEntrega', etiqueta: 'Puesto / área de trabajo de quien entrega', tipo: 'texto', requerido: true },
    { id: 'quienRecibe', etiqueta: 'Nombre a quien se entrega', tipo: 'texto', requerido: true },
    { id: 'tipoIdRecibe', etiqueta: 'Tipo de identificación de quien recibe', tipo: 'seleccion', requerido: true, opciones: ['INE', 'Pasaporte', 'Cartilla militar', 'Cédula profesional'] },
    { id: 'folioRecibe', etiqueta: 'Folio / número de identificación de quien recibe', tipo: 'texto', requerido: true },
    { id: 'tipoBien', etiqueta: 'Tipo de bien', tipo: 'seleccion', requerido: true, opciones: ['Vehículo', 'Equipo de cómputo'] },
    { id: 'descripcion', etiqueta: 'Descripción del bien', tipo: 'texto', requerido: true },
    { id: 'marca', etiqueta: 'Marca', tipo: 'texto', requerido: true },
    { id: 'modelo', etiqueta: 'Modelo', tipo: 'texto', requerido: true },
    { id: 'noSerie', etiqueta: 'No. de serie', tipo: 'texto', requerido: true },
    { id: 'estadoFisico', etiqueta: 'Estado físico', tipo: 'seleccion', requerido: true, opciones: ['Bueno', 'Usado', 'Con detalles'] },
    { id: 'especifiqueDetalles', etiqueta: 'Especifique detalles', tipo: 'texto', requerido: true, mostrarSi: { campo: 'estadoFisico', valor: 'Con detalles' } },
    { id: 'valorEstimado', etiqueta: 'Valor estimado', tipo: 'moneda', requerido: true },
    { id: 'fotos', etiqueta: 'Fotos de las condiciones del equipo', tipo: 'fotos', requerido: true },
    { id: 'condiciones', etiqueta: 'Condiciones de uso y resguardo', tipo: 'area', requerido: true },
    { id: 'lugar', etiqueta: 'Lugar de préstamo', tipo: 'texto', requerido: true },
    { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
  ],
  'carta-renuncia': [
    { id: 'empleado', etiqueta: 'Nombre del empleado', tipo: 'texto', requerido: true },
    { id: 'numeroEmpleado', etiqueta: 'Número de empleado', tipo: 'texto', requerido: true },
    { id: 'puesto', etiqueta: 'Puesto desempeñado', tipo: 'texto', requerido: true },
    { id: 'empresa', etiqueta: 'Empresa', tipo: 'texto', requerido: true },
    { id: 'ultimoDia', etiqueta: 'Último día laborable', tipo: 'fecha', requerido: true },
    { id: 'motivo', etiqueta: 'Motivo de la renuncia', tipo: 'seleccion', requerido: true, opciones: ['Motivos personales', 'Crecimiento profesional', 'Otro'] },
    { id: 'especifiqueMotivo', etiqueta: 'Especifique el motivo', tipo: 'texto', requerido: true, mostrarSi: { campo: 'motivo', valor: 'Otro' } },
    { id: 'lugar', etiqueta: 'Lugar', tipo: 'texto', requerido: true },
    { id: 'fecha', etiqueta: 'Fecha de la carta', tipo: 'fecha', requerido: true },
  ],
  'carta-intencion': [
    { id: 'emisoraNombre', etiqueta: 'Nombre de la parte emisora (o Razón Social)', tipo: 'texto', requerido: true },
    { id: 'emisoraTipoId', etiqueta: 'Tipo de identificación o RFC de la emisora', tipo: 'seleccion', requerido: true, opciones: ['INE', 'Pasaporte', 'Cartilla militar', 'Cédula profesional', 'RFC'] },
    { id: 'emisoraFolio', etiqueta: 'Folio / número de identificación de la emisora', tipo: 'texto', requerido: true },
    { id: 'emisoraRepresentante', etiqueta: 'Nombre del representante legal (emisora, opcional)', tipo: 'texto', requerido: false },
    { id: 'receptoraNombre', etiqueta: 'Nombre de la parte receptora (o Razón Social)', tipo: 'texto', requerido: true },
    { id: 'receptoraTipoId', etiqueta: 'Tipo de identificación o RFC de la receptora', tipo: 'seleccion', requerido: true, opciones: ['INE', 'Pasaporte', 'Cartilla militar', 'Cédula profesional', 'RFC'] },
    { id: 'receptoraFolio', etiqueta: 'Folio / número de identificación de la receptora', tipo: 'texto', requerido: true },
    { id: 'receptoraRepresentante', etiqueta: 'Nombre del representante legal (receptora, opcional)', tipo: 'texto', requerido: false },
    { id: 'objeto', etiqueta: 'Objeto / propósito de la intención', tipo: 'area', requerido: true },
    { id: 'confidencialidad', etiqueta: '¿Incluir cláusula de confidencialidad?', tipo: 'check', requerido: false },
    { id: 'vinculante', etiqueta: '¿Tiene carácter vinculante?', tipo: 'check', requerido: false },
    { id: 'vigencia', etiqueta: 'Vigencia de la intención (límite del acuerdo)', tipo: 'fecha', requerido: true },
    { id: 'lugar', etiqueta: 'Lugar de firma', tipo: 'texto', requerido: true },
    { id: 'fecha', etiqueta: 'Fecha de la carta', tipo: 'fecha', requerido: true },
  ],
  'aviso-privacidad': [
    { id: 'razonSocial', etiqueta: 'Razón social del responsable', tipo: 'texto', requerido: true },
    { id: 'domicilio', etiqueta: 'Domicilio', tipo: 'texto', requerido: true },
    { id: 'tipoAviso', etiqueta: 'Tipo de aviso', tipo: 'seleccion', requerido: true, opciones: ['Integral', 'Simplificado', 'Corto'] },
    { id: 'datosRecabados', etiqueta: 'Datos personales que se recaban', tipo: 'area', requerido: true, filas: 5 },
    { id: 'finalidad', etiqueta: 'Finalidad del tratamiento', tipo: 'area', requerido: true, filas: 5 },
    { id: 'transferencia', etiqueta: '¿Se transfieren datos a terceros?', tipo: 'switch', requerido: false },
    { id: 'transferenciaDetalle', etiqueta: '¿A quién y para qué se transfieren?', tipo: 'texto', requerido: true, mostrarSi: { campo: 'transferencia', valor: true } },
    { id: 'contactoArco', etiqueta: 'Contacto para derechos ARCO', tipo: 'email', requerido: true },
    { id: 'fecha', etiqueta: 'Fecha de última actualización', tipo: 'fecha', requerido: true },
  ],
  'aviso-rescision': [
    { id: 'trabajador', etiqueta: 'Nombre del trabajador', tipo: 'texto', requerido: true },
    { id: 'numeroEmpleado', etiqueta: 'Número de empleado', tipo: 'texto', requerido: true },
    { id: 'puesto', etiqueta: 'Puesto', tipo: 'texto', requerido: true },
    { id: 'causa', etiqueta: 'Causa de la rescisión (hora, día y circunstancias)', tipo: 'area', requerido: true, filas: 6 },
    { id: 'fundamentoLegal', etiqueta: 'Fundamento legal (Art. 47 LFT)', tipo: 'seleccion', requerido: false, opciones: ['Fracción I', 'Fracción II', 'Fracción III', 'Fracción IV', 'Fracción V', 'Fracción VI', 'Fracción VII', 'Fracción VIII', 'Fracción IX', 'Fracción X', 'Fracción XI', 'Fracción XII', 'Fracción XIII', 'Fracción XIV', 'Fracción XIV Bis', 'Fracción XV'] },
    { id: 'nombreRepresentante', etiqueta: 'Nombre del representante legal / patrón', tipo: 'texto', requerido: true },
    { id: 'cargoRepresentante', etiqueta: 'Cargo del representante legal / patrón', tipo: 'texto', requerido: true },
    { id: 'lugar', etiqueta: 'Lugar', tipo: 'texto', requerido: true },
    { id: 'fechaRescision', etiqueta: 'Fecha de la rescisión', tipo: 'fecha', requerido: true },
    { id: 'fecha', etiqueta: 'Fecha del aviso', tipo: 'fecha', requerido: true },
  ],
  'aviso-funcionamiento': [
    { id: 'autoridadDestino', etiqueta: 'Autoridad a la que se dirige', tipo: 'texto', requerido: true, ayuda: 'Ej. Secretaría de Salud Pública Municipal' },
    { id: 'establecimiento', etiqueta: 'Establecimiento / razón social', tipo: 'texto', requerido: true },
    { id: 'rfc', etiqueta: 'RFC del establecimiento', tipo: 'texto', requerido: true },
    { id: 'giro', etiqueta: 'Giro o actividad', tipo: 'texto', requerido: true },
    { id: 'domicilio', etiqueta: 'Domicilio del establecimiento', tipo: 'texto', requerido: true },
    { id: 'responsable', etiqueta: 'Responsable sanitario / legal', tipo: 'texto', requerido: true },
    { id: 'horario', etiqueta: 'Horario de funcionamiento (días y horas)', tipo: 'texto', requerido: false },
    { id: 'fechaApertura', etiqueta: 'Fecha de apertura', tipo: 'fecha', requerido: true },
    { id: 'fecha', etiqueta: 'Fecha del aviso', tipo: 'fecha', requerido: true },
  ],
  'oficio-peticion': [
    { id: 'nombreDestinatario', etiqueta: 'Nombre del destinatario', tipo: 'texto', requerido: true },
    { id: 'cargoDestinatario', etiqueta: 'Cargo del destinatario', tipo: 'texto', requerido: true },
    { id: 'dependenciaDestinatario', etiqueta: 'Dependencia del destinatario', tipo: 'texto', requerido: true },
    { id: 'nombreRemitente', etiqueta: 'Nombre del remitente', tipo: 'texto', requerido: true },
    { id: 'cargoRemitente', etiqueta: 'Cargo del remitente', tipo: 'texto', requerido: true },
    { id: 'folio', etiqueta: 'Número de oficio', tipo: 'texto', requerido: true },
    { id: 'asunto', etiqueta: 'Asunto', tipo: 'texto', requerido: true },
    { id: 'peticion', etiqueta: 'Petición solicitada', tipo: 'area', requerido: true },
    { id: 'ccp', etiqueta: 'C.c.p (con copia para)', tipo: 'check', requerido: false },
    { id: 'ccpDetalle', etiqueta: 'Detalle C.c.p (a quién se envía copia)', tipo: 'texto', requerido: true, mostrarSi: { campo: 'ccp', valor: true } },
    { id: 'anexos', etiqueta: 'Anexos', tipo: 'anexos', requerido: false },
    { id: 'fundamentarArt8', etiqueta: '¿Fundamentar en el Art. 8 Constitucional?', tipo: 'switch', requerido: false },
    { id: 'lugar', etiqueta: 'Lugar', tipo: 'texto', requerido: true },
    { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
  ],
  'oficio-comision': [
    { id: 'nombreComisionado', etiqueta: 'Nombre del comisionado', tipo: 'texto', requerido: true },
    { id: 'cargoComisionado', etiqueta: 'Cargo del comisionado', tipo: 'texto', requerido: true },
    { id: 'numeroEmpleadoComisionado', etiqueta: 'Número de empleado del comisionado', tipo: 'texto', requerido: true },
    { id: 'folio', etiqueta: 'Número de oficio', tipo: 'texto', requerido: true },
    { id: 'destino', etiqueta: 'Destino de la comisión', tipo: 'texto', requerido: true },
    { id: 'fechaInicio', etiqueta: 'Fecha de inicio', tipo: 'fecha', requerido: true },
    { id: 'fechaFin', etiqueta: 'Fecha de término', tipo: 'fecha', requerido: true },
    { id: 'motivo', etiqueta: 'Motivo de la comisión', tipo: 'area', requerido: true },
    { id: 'nombreAutoriza', etiqueta: 'Nombre completo de quien comisiona', tipo: 'texto', requerido: true },
    { id: 'cargoAutoriza', etiqueta: 'Cargo de quien comisiona', tipo: 'texto', requerido: true },
    { id: 'viaticos', etiqueta: '¿Se otorgan viáticos?', tipo: 'check', requerido: false },
    { id: 'montoViaticos', etiqueta: 'Monto de viáticos', tipo: 'moneda', requerido: true, mostrarSi: { campo: 'viaticos', valor: true } },
    { id: 'lugar', etiqueta: 'Lugar de emisión', tipo: 'texto', requerido: true },
    { id: 'fecha', etiqueta: 'Fecha de emisión', tipo: 'fecha', requerido: true },
  ],
  'oficio-resolucion': [
    { id: 'nombreDestinatario', etiqueta: 'Nombre del destinatario', tipo: 'texto', requerido: true },
    { id: 'cargoDestinatario', etiqueta: 'Cargo del destinatario', tipo: 'texto', requerido: true },
    { id: 'folio', etiqueta: 'Número de resolución', tipo: 'texto', requerido: true },
    { id: 'referenciaOrigen', etiqueta: 'Oficio o petición de origen', tipo: 'texto', requerido: true, ayuda: 'Ej. En respuesta a su solicitud OF-001 de fecha...' },
    { id: 'interesado', etiqueta: 'Interesado / promovente', tipo: 'texto', requerido: true },
    { id: 'asunto', etiqueta: 'Asunto', tipo: 'texto', requerido: true },
    {
      id: 'sentido', etiqueta: 'Sentido de la resolución', tipo: 'seleccion',
      requerido: true, opciones: ['Favorable', 'No favorable', 'Parcialmente favorable'],
    },
    { id: 'considerandos', etiqueta: 'Considerandos / fundamentos', tipo: 'area', requerido: true, filas: 5 },
    { id: 'puntosResolutivos', etiqueta: 'Puntos resolutivos', tipo: 'area', requerido: true, filas: 5, ayuda: 'Ej. PRIMERO: Se autoriza el pago. SEGUNDO: Archívese el expediente.' },
    { id: 'nombreResuelve', etiqueta: 'Nombre de quien resuelve', tipo: 'texto', requerido: true },
    { id: 'cargoResuelve', etiqueta: 'Cargo de quien resuelve', tipo: 'texto', requerido: true },
    { id: 'lugar', etiqueta: 'Lugar', tipo: 'texto', requerido: true },
    { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
  ],
  'notificacion-general': [
    { id: 'destinatario', etiqueta: 'Destinatario', tipo: 'texto', requerido: true },
    { id: 'domicilio', etiqueta: 'Domicilio para notificar', tipo: 'texto', requerido: true },
    { id: 'expediente', etiqueta: 'Expediente / referencia', tipo: 'texto', requerido: false },
    { id: 'nombreNotifica', etiqueta: 'Nombre de quien notifica', tipo: 'texto', requerido: true },
    { id: 'cargoNotifica', etiqueta: 'Cargo / Área de quien notifica', tipo: 'texto', requerido: true, ayuda: 'Ej. Departamento de Cobranza o Dirección General' },
    { id: 'extracto', etiqueta: 'Extracto de lo que se notifica', tipo: 'area', requerido: true, filas: 6 },
    { id: 'acuseRecibo', etiqueta: '¿Incluir acuse de recibo?', tipo: 'switch', requerido: false, ayuda: 'Genera bloque final con líneas para Nombre, Firma, Fecha y Hora de recepción' },
    { id: 'lugar', etiqueta: 'Lugar', tipo: 'texto', requerido: true },
    { id: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
  ],
};
// ============ AQUÍ TERMINA CAMPOS_POR_TIPO ============

// ============ AQUÍ EMPIEZA HELPERS DE VISTA ============
// Helpers para la vista (resuelven nombres y listas sin exponer el catálogo).
export const nombreCategoria = (id) =>
  CATEGORIAS.find((c) => c.id === id)?.nombre ?? '';

export const tiposDeCategoria = (idCategoria) =>
  TIPOS_POR_CATEGORIA[idCategoria] ?? [];

export const nombreTipo = (idCategoria, idTipo) =>
  tiposDeCategoria(idCategoria).find((t) => t.id === idTipo)?.nombre ?? '';

export const camposDeTipo = (idTipo) => CAMPOS_POR_TIPO[idTipo] ?? [];
// ============ AQUÍ TERMINA HELPERS DE VISTA ============

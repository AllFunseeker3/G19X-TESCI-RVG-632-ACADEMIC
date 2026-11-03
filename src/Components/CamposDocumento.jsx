// ============================================================================
// ARCHIVO: src/Components/CamposDocumento.jsx
// FUNCIÓN GENERAL: grid de campos del formulario dinámico, con las secciones
//   propias de cada uno de los 11 tipos de documento.
// FLUJO DE DATOS:
//   - ENTRAN: tipo, campos visibles del catálogo, datos/errores capturados y
//     los handlers del padre (GenerarCarta).
//   - SALEN: solo visual; cada campo delega su cambio en el padre.
// QUÉ MODIFICAR SI hay cambios: secciones/columnas de un tipo o el ancho de
//   area/fotos/anexos (una sola columna en el grid).
// ============================================================================
import { Box } from '@mui/material';
import CampoFormulario from './CampoFormulario';
import SeccionFormulario from './SeccionFormulario';

// ============ AQUÍ EMPIEZA CAMPOS POR TIPO ============
export default function CamposDocumento({
  tipoDoc,
  camposVisibles,
  datos,
  errores,
  campoEnfocado,
  onFocusCampo,
  onBlurCampo,
  onChangeCampo,
  onQuitarAnexo,
}) {
  // Resuelve campos por id y los pinta (area/fotos/anexos a ancho completo).
  const campoPorId = (id) => camposVisibles.find((c) => c.id === id);
  const renderCampo = (campo) => (
    <CampoFormulario
      campo={campo}
      valor={datos[campo.id]}
      error={errores[campo.id]}
      ayudaVisible={campoEnfocado === campo.id}
      onChange={onChangeCampo(campo)}
      onFocus={() => onFocusCampo(campo.id)}
      onBlur={onBlurCampo}
      onQuitarAnexo={campo.tipo === 'anexos' ? onQuitarAnexo(campo.id) : undefined}
    />
  );
  const renderGrupo = (ids) => ids
    .map(campoPorId)
    .filter(Boolean)
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
  );
}
// ============ AQUÍ TERMINA CAMPOS POR TIPO ============

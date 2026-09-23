/* ============================================================================
 * ARCHIVO: src/Pages/Inicio.jsx
 * FUNCIÓN GENERAL: Dashboard principal ("Resumen operativo").
 *   - Banner de saludo por hora con el NOMBRE del logueado + conteos reales.
 *   - Tarjeta Notificaciones (documentos por revisar desde la BD, funcional).
 *   - 4 tarjetas KPI (total/aprobadas/por revisar/rechazadas, valores fijos demo).
 *   - Accesos directos (Generar / Revisar / Plantillas / Seguimiento).
 *   - Gráfica dona por estado + actividad reciente (GET actividad/reciente)
 *     + buscador sobre la lista real + tabla de procesados (TablaGeneral).
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE):
 *     -> ../lib/api.js: getDocumentos(), getActividad(), leerUsuario().
 *        Todo filtrado por área y permiso en server/routes/documentos.js.
 *     -> ../lib/estados.js: estadoBonito() para etiquetas visibles.
 *     -> app.jsx: monta esta página en "/Inicio" dentro de DashBoardLayout.
 *   - SALEN (DATOS QUE SE MANDAN A <archivo> para procesamiento):
 *     -> ../Components/TablaGeneral.jsx: datos={tablaDocs} (filas reales).
 *     -> Revision.jsx (botón "Ir a revisión" y acceso directo /Revision).
 *     -> Seguimiento.jsx (botón "Ver trazabilidad completa" y resultados del
 *        buscador con to="/Seguimiento").
 *     -> GenerarCarta.jsx vía ruta /Menu (acceso "Generar documento").
 *     -> plantillas.jsx vía ruta /Plantillas (acceso "Plantillas").
 * QUÉ MODIFICAR SI hay cambios:
 *   - KPIs: hoy son números fijos (150/75/75/200); calcúlalos del back.
 *   - Estilos: cada <Box> tiene id (los preexistentes con espacios se
 *     conservaron tal cual; los nuevos usan id="Box-Inicio-*").
 * No se cambió lógica ni JSX, solo comentarios e ids en <Box>.
 * ========================================================================== */
import { useEffect, useState } from 'react';
import {Box, Grid,Card, CardContent, Typography, List, ListItem, ListItemText, ListItemIcon, Button, TextField, InputLabel, Chip} from '@mui/material';
import { Link } from 'react-router-dom';
// DATOS REALES: lista, actividad y usuario (server/routes/documentos.js + login).
import { getActividad, getDocumentos, leerUsuario } from '../lib/api.js';
// Etiquetas visibles de estados (código API -> texto).
import { estadoBonito } from '../lib/estados.js';
import SearchIcon from '@mui/icons-material/Search';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CancelIcon from '@mui/icons-material/Cancel';
import PostAddIcon from '@mui/icons-material/PostAdd';
import RateReviewIcon from '@mui/icons-material/RateReview';
import GridViewIcon from '@mui/icons-material/GridView';
import TimelineIcon from '@mui/icons-material/Timeline';
import HistoryIcon from '@mui/icons-material/History';
// DATOS PROVENIENTES DE ../Components/TablaGeneral.jsx: tabla reutilizable del resumen.
import TablaGeneral from '../Components/TablaGeneral';

// CONSTANTE: tarjetas de accesos directos (icono + destino).
// QUÉ HACE: define título, descripción, icono y ruta de cada acceso.
// DÓNDE SE USA: sección id="Accesos directos" (map a Card-Link).
// QUÉ MODIFICAR SI: agregar/quitar accesos o cambiar rutas (/Menu, /Revision...).
// DATOS QUE SE MANDAN A GenerarCarta.jsx (/Menu), Revision.jsx, plantillas.jsx y Seguimiento.jsx para procesamiento: a.to.
const ACCESOS = [
  { titulo: 'Generar documento', descripcion: 'Nueva carta, oficio o aviso', icono: <PostAddIcon sx={{ color: 'encabezado.main' }} />, to: '/Menu' },
  { titulo: 'Revisar', descripcion: 'Aprobar o rechazar pendientes', icono: <RateReviewIcon sx={{ color: 'encabezado.main' }} />, to: '/Revision' },
  { titulo: 'Plantillas', descripcion: 'Ver las 11 plantillas', icono: <GridViewIcon sx={{ color: 'encabezado.main' }} />, to: '/Plantillas' },
  { titulo: 'Seguimiento', descripcion: 'Trazabilidad por documento', icono: <TimelineIcon sx={{ color: 'encabezado.main' }} />, to: '/Seguimiento' },
];

// CONSTANTE: color hex por estado para la dona y leyenda.
// QUÉ HACE: mapea estado -> color CSS del conic-gradient.
// DÓNDE SE USA: cálculo de `dona` y puntos de leyenda.
// QUÉ MODIFICAR SI: agregas un estado nuevo en ../lib/estados.js, añade su color aquí.
const COLOR_HEX = {
  Aprobado: '#2e7d32',
  Rechazado: '#d32f2f',
  'Por revisar': '#ed6c02',
  Notificado: '#0288d2',
  Borrador: '#9e9e9e',
};

// QUÉ HACE: página dashboard con resumen, accesos, dona, actividad, buscador y tabla.
// DÓNDE SE USA: ruta "/Inicio" en app.jsx (dentro de DashBoardLayout).
export default function Inicio() {
  // DATOS REALES: lista completa (dona/buscador/tabla) + actividad del back.
  // (server/routes/documentos.js, ya filtrados por área y permiso).
  // Si el servidor cae, api.js dispara el evento y app.jsx regresa al login.
  const [todos, setTodos] = useState([]);
  const [actividad, setActividad] = useState([]);
  useEffect(() => {
    let vivo = true;
    getDocumentos()
      .then((filas) => {
        if (vivo) setTodos(Array.isArray(filas) ? filas : []);
      })
      .catch(() => {});
    getActividad(6)
      .then((acts) => {
        if (vivo) {
          setActividad(
            (Array.isArray(acts) ? acts : []).map((a) => ({
              docId: `#${a.docId}`,
              tipo: a.tipo,
              etapa: estadoBonito(a.etapa),
              fecha: String(a.fecha ?? '').slice(0, 16).replace('T', ' '),
              responsable: a.responsable ?? '—',
              comentario: a.comentario ?? '',
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // CÁLCULO: conteo por estado para la gráfica (etiquetas visibles).
  // DÓNDE SE USA: segmentos/dona + leyenda de "Documentos por estado".
  const conteo = {};
  todos.forEach((d) => {
    const e = estadoBonito(d.estado);
    conteo[e] = (conteo[e] ?? 0) + 1;
  });
  const estados = Object.keys(conteo);
  const total = todos.length;
  let acumulado = 0;
  const segmentos = estados.map((e) => {
    const inicio = total === 0 ? 0 : (acumulado / total) * 100;
    acumulado += conteo[e];
    const fin = total === 0 ? 0 : (acumulado / total) * 100;
    return `${COLOR_HEX[e] ?? '#9e9e9e'} ${inicio}% ${fin}%`;
  });
  const dona = total === 0
    ? '#e0e0e0'
    : `conic-gradient(${segmentos.join(', ')})`;

  // USUARIO LOGUEADO: nombre para el saludo (lo guarda Ingreso.jsx al login).
  // DATOS PROVENIENTES DE ../lib/api.js -> leerUsuario() (localStorage).
  const [usuario] = useState(() => leerUsuario());
  const primerNombre = (usuario?.nombre ?? "Residente").trim().split(/\s+/)[0];

  // NOTIFICACIONES: por revisar y borradores derivados de la lista real.
  const notis = {
    porRevisar: todos.filter((d) => d.estado === 'por_revisar').slice(0, 5),
    borradores: todos.filter((d) => d.estado === 'borrador').length,
  };

  // CÁLCULO: banner con saludo por hora + conteos REALES (notis, no demo).
  // DÓNDE SE USA: tarjeta id="Banner de bienvenida" (id preexistente, conservado).
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
  const porRevisar = notis.porRevisar.length;
  const borradores = notis.borradores;

  // ESTADO: texto del buscador por folio, tipo o cliente (filtra la lista real).
  // QUÉ HACE: filtra `todos` y muestra hasta 5 resultados con link a Seguimiento.
  // DÓNDE SE USA: sección id="Buscador de documentos".
  // DATOS QUE SE MANDAN A Seguimiento.jsx para procesamiento: cada resultado linkea a "/Seguimiento".
  const [busqueda, setBusqueda] = useState('');
  const resultados = busqueda.trim() === ''
    ? []
    : todos
      .filter((d) => `#${d.id} ${d.tipo} ${d.cliente ?? ''} ${d.folio ?? ''}`.toLowerCase().includes(busqueda.toLowerCase()))
      .slice(0, 5);

  // TABLA inferior: últimos 6 reales con etiquetas visibles (ver TablaGeneral).
  const tablaDocs = todos.slice(0, 6).map((d) => ({
    id: `#${d.id}`,
    tipo: d.tipo,
    cliente: d.cliente ?? '—',
    fecha: String(d.creado_en ?? '').slice(0, 10),
    estado: estadoBonito(d.estado),
  }));

  return (
    // SECCIÓN JSX: contenedor raíz de la página (id nuevo descriptivo).
    <Box id="Box-Inicio-Contenedor" sx={{pt:1,pl:0, width:'100%'}}>

      {/* SECCIÓN JSX: banner de bienvenida (id preexistente conservado).
          DATOS QUE SE MANDAN A Revision.jsx para procesamiento: botón "Ir a revisión" -> to="/Revision". */}
      <Box id="Banner de bienvenida" sx={{width: '99%', mb: 4}}>
        <Card sx={{
          // Banner con el acento elegido (azul/rojo/verde/blanco); el degradado
          // usa primary.main -> primary.dark que MUI deriva solo.
          background: (theme) => `linear-gradient(120deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'primary.contrastText',
          borderRadius: 2,
        }}>
          <CardContent sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap'}}>
            {/* SECCIÓN JSX: texto del banner (saludo + pendientes REALES). */}
            <Box id="Box-Inicio-BannerTexto">
              <Typography variant="h5" fontWeight="bold">
                {saludo}, {primerNombre}
              </Typography>
              {/* Opacidad en vez de blanco fijo para que se lea en acento blanco también. */}
              <Typography sx={{opacity: 0.85}}>
                Tienes {porRevisar} documento(s) por revisar y {borradores} borrador(es) en captura.
              </Typography>
            </Box>
            <Button component={Link} to="/Revision" variant="contained"
              sx={{bgcolor: 'primary.contrastText', color: 'primary.main', fontWeight: 'bold', '&:hover': {bgcolor: 'primary.contrastText', opacity: 0.9}}}>
              Ir a revisión
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* SECCIÓN JSX: notificaciones REALES (reemplaza la campana de prueba).
          DATOS PROVENIENTES DE la lista real `todos` (filtrada a por_revisar)
          (ya filtrados por área y permiso). Máx 5 + link a /Revision. */}
      <Box id="Box-Inicio-Notificaciones" sx={{width: '99%', mb: 4}}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1}}>
              <Typography variant="h6" fontWeight="bold" color="encabezado.main">
                Notificaciones
              </Typography>
              <Chip
                label={porRevisar === 0 ? 'Sin pendientes' : `${porRevisar} por revisar`}
                color={porRevisar === 0 ? 'default' : 'warning'}
                sx={{fontWeight: 'bold'}}
              />
            </Box>
            {notis.porRevisar.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No tienes documentos por revisar. Todo al día.
              </Typography>
            ) : (
              <List dense>
                {notis.porRevisar.map((d) => (
                  <ListItem
                    key={d.id}
                    disablePadding
                    sx={{py: 0.5}}
                    secondaryAction={
                      <Button component={Link} to="/Revision" size="small" variant="outlined" sx={{ borderColor: 'encabezado.main', color: 'encabezado.main' }}>
                        Revisar
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={`#${d.id} — ${d.tipo}`}
                      secondary={`Folio: ${d.folio ?? 's/f'} · Creado: ${String(d.creado_en ?? '').slice(0, 10)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* SECCIÓN JSX: tarjetas KPI (id preexistente conservado). Valores fijos demo. */}
      <Box id="ContenedorTarjetas" sx={{width: '99%'}}>
      <Typography variant="h4" fontWeight="bold" sx={{mb:3}}>
        Resumen operativo
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background:'linear-gradient(to right, #1e3c72, #2a5298)',
            color:'#fff',
            borderRadius:2,}}>
            <CardContent>
              {/* SECCIÓN JSX: fila icono+texto de la tarjeta Total. */}
              <Box id="Box-Inicio-TarjetaTotal" sx={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                {/* SECCIÓN JSX: textos de la tarjeta Total. */}
                <Box id="Box-Inicio-TarjetaTotalTexto">
                  <Typography variant="h6" fontWeight="bold">Total de cartas</Typography>
                  <Typography variant="h4" fontWeight="bold">150</Typography>
                </Box>
                <InsertDriveFileIcon sx={{fontSize:50, opacity:0.8}} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background:'linear-gradient(to right, #11998e, #38ef7d)',
            color:'#fff',
            borderRadius:2,}}>
            <CardContent>
              {/* SECCIÓN JSX: fila icono+texto de la tarjeta Aprobadas. */}
              <Box id="Box-Inicio-TarjetaAprobadas" sx={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                {/* SECCIÓN JSX: textos de la tarjeta Aprobadas. */}
                <Box id="Box-Inicio-TarjetaAprobadasTexto">
                  <Typography variant="h6" fontWeight="bold">Aprobadas</Typography>
                  <Typography variant="h4" fontWeight="bold">75</Typography>
                </Box>
                <CheckCircleIcon sx={{fontSize:50, opacity:0.8}} />
              </Box>
            </CardContent>
          </Card>
        </Grid>


        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background:'linear-gradient(to right, #f2994a, #f2c94c)',
            color:'#fff',
            borderRadius:2,}}>
            <CardContent>
              {/* SECCIÓN JSX: fila icono+texto de la tarjeta Por revisar. */}
              <Box id="Box-Inicio-TarjetaPorRevisar" sx={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                {/* SECCIÓN JSX: textos de la tarjeta Por revisar. */}
                <Box id="Box-Inicio-TarjetaPorRevisarTexto">
                  <Typography variant="h6" fontWeight="bold">Por revisar</Typography>
                  <Typography variant="h4" fontWeight="bold">75</Typography>
                </Box>
                <PendingActionsIcon sx={{fontSize:50, opacity:0.8}} />
              </Box>
            </CardContent>
          </Card>
        </Grid>


        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background:'linear-gradient(to right, #ff416c, #ff4b2b)',
            color:'#fff',
            borderRadius:2,}}>
            <CardContent>
              {/* SECCIÓN JSX: fila icono+texto de la tarjeta Rechazadas. */}
              <Box id="Box-Inicio-TarjetaRechazadas" sx={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                {/* SECCIÓN JSX: textos de la tarjeta Rechazadas. */}
                <Box id="Box-Inicio-TarjetaRechazadasTexto">
                  <Typography variant="h6" fontWeight="bold">Rechazadas</Typography>
                  <Typography variant="h4" fontWeight="bold">200</Typography>
                </Box>
                <CancelIcon sx={{fontSize:50, opacity:0.8}} />
              </Box>
            </CardContent>
          </Card>
        </Grid>


      </Grid>
    </Box>

    {/* SECCIÓN JSX: accesos directos (id preexistente conservado).
        DATOS QUE SE MANDAN A GenerarCarta.jsx (/Menu), Revision.jsx, plantillas.jsx y Seguimiento.jsx
        para procesamiento: Card-Link con to={a.to}. */}
    <Box id="Accesos directos" sx={{width: '99%', mt: 5}}>
      <Typography variant="h6" fontWeight="bold" sx={{mb: 2, color:'text.secondary'}}>
        Accesos directos
      </Typography>
      <Grid container spacing={3}>
        {ACCESOS.map((a) => (
          <Grid item xs={12} sm={6} md={3} key={a.to}>
            <Card
              component={Link}
              to={a.to}
              sx={{
                borderRadius: 2,
                textDecoration: 'none',
                display: 'block',
                border: '1px solid rgba(22, 49, 114, 0.12)',
                transition: 'transform .15s, box-shadow .15s',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
              }}
            >
              <CardContent sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                {/* SECCIÓN JSX: recuadro del icono del acceso (id único por destino). */}
                <Box id={`Box-Inicio-AccesoIcono-${a.to.replace('/', '')}`} sx={{
                  width: 48, height: 48, borderRadius: 2, display: 'grid',
                  placeItems: 'center', bgcolor: 'rgba(22, 49, 114, 0.08)',
                }}>
                  {a.icono}
                </Box>
                {/* SECCIÓN JSX: título + descripción del acceso (id único por destino). */}
                <Box id={`Box-Inicio-AccesoTexto-${a.to.replace('/', '')}`}>
                  <Typography variant="subtitle1" fontWeight="bold" color="encabezado.main">
                    {a.titulo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {a.descripcion}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>

    {/* SECCIÓN JSX: fila dona por estado + actividad reciente. */}
    <Box id="Box-Inicio-FilaEstadisticas" sx={{width: '99%', mt: 5}}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          {/* SECCIÓN JSX: dona por estado (id preexistente conservado). */}
          <Box id="Resumen por estado">
            <Card sx={{borderRadius: 2, height: '100%'}}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{mb: 2, color:'text.secondary'}}>
                  Documentos por estado
                </Typography>
                {/* SECCIÓN JSX: layout dona + leyenda. */}
                <Box id="Box-Inicio-DonaLayout" sx={{display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap'}}>
                  {/* SECCIÓN JSX: círculo de la dona (conic-gradient). */}
                  <Box id="Box-Inicio-DonaGrafica" sx={{position: 'relative', width: 150, height: 150, flexShrink: 0}}>
                    {/* SECCIÓN JSX: anillo de color con el gradiente calculado. */}
                    <Box id="Box-Inicio-DonaAnillo" sx={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      background: dona,
                    }} />
                    {/* SECCIÓN JSX: centro de la dona (usa papel del tema para oscuro/claro). */}
                    <Box id="Box-Inicio-DonaCentro" sx={{
                      position: 'absolute', inset: '22px', borderRadius: '50%',
                      bgcolor: 'background.paper', display: 'grid', placeItems: 'center',
                    }}>
                      {/* SECCIÓN JSX: total de documentos al centro. */}
                      <Box id="Box-Inicio-DonaTotalTexto" sx={{textAlign: 'center'}}>
                        <Typography variant="h5" fontWeight="bold" color="encabezado.main">{total}</Typography>
                        <Typography variant="caption" color="text.secondary">docs</Typography>
                      </Box>
                    </Box>
                  </Box>
                  {/* SECCIÓN JSX: leyenda estado -> conteo. */}
                  <Box id="Box-Inicio-DonaLeyenda" sx={{flexGrow: 1, minWidth: 140}}>
                    {estados.map((e) => (
                      // SECCIÓN JSX: fila de leyenda (id único por estado).
                      <Box key={e} id={`Box-Inicio-DonaLeyenda-${e}`} sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
                        {/* SECCIÓN JSX: punto de color del estado. */}
                        <Box id={`Box-Inicio-DonaPunto-${e}`} sx={{width: 12, height: 12, borderRadius: '50%', bgcolor: COLOR_HEX[e]}} />
                        <Typography variant="body2" sx={{flexGrow: 1}}>{e}</Typography>
                        <Typography variant="body2" fontWeight="bold">{conteo[e]}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
        <Grid item xs={12} md={7}>
          {/* SECCIÓN JSX: actividad reciente (id preexistente conservado).
              DATOS QUE SE MANDAN A Seguimiento.jsx para procesamiento: botón a "/Seguimiento". */}
          <Box id="Actividad reciente">
            <Card sx={{borderRadius: 2, height: '100%'}}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{mb: 1, color:'text.secondary'}}>
                  Actividad reciente
                </Typography>
                <List dense>
                  {actividad.map((a, i) => (
                    <ListItem key={i} disablePadding sx={{py: 0.5}}>
                      <ListItemIcon sx={{minWidth: 36}}>
                        <HistoryIcon sx={{ color: 'encabezado.main' }} fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${a.docId} ${a.tipo} — ${a.etapa}`}
                        secondary={`${a.responsable} · ${a.fecha}`}
                      />
                    </ListItem>
                  ))}
                </List>
                <Button
                  component={Link}
                  to="/Seguimiento"
                  size="small"
                  sx={{ mt: 1, color: 'encabezado.main' }}
                >
                  Ver trazabilidad completa
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>

    {/* SECCIÓN JSX: buscador sobre la lista real (id preexistente conservado). */}
    <Box id="Box-Inicio-FilaBuscadorVencimientos" sx={{width: '99%', mt: 5}}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          {/* SECCIÓN JSX: buscador (id preexistente conservado). Filtra `todos` en memoria. */}
          <Box id="Buscador de documentos">
            <Card sx={{borderRadius: 2, height: '100%'}}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{mb: 1, color:'text.secondary'}}>
                  Buscar documento
                </Typography>
                <InputLabel
                  shrink
                  htmlFor="buscar-documento"
                  sx={{ position: 'static', transform: 'none', fontSize: '0.75rem', display: 'block', mb: 0.5 }}
                >
                  Folio, tipo o cliente
                </InputLabel>
                <TextField
                  id="buscar-documento"
                  fullWidth
                  variant="standard"
                  placeholder="Ej. #101, Carta Poder, Tech Solutions…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'encabezado.main', mr: 1 }} />,
                  }}
                />
                {busqueda.trim() !== '' && (
                  <List dense sx={{mt: 1}}>
                    {resultados.map((d) => (
                      <ListItem
                        key={d.id}
                        button
                        component={Link}
                        to="/Seguimiento"
                        sx={{borderRadius: 1}}
                      >
                        <ListItemText
                          primary={`#${d.id} — ${d.tipo}`}
                          secondary={`${d.cliente ?? '—'} · ${estadoBonito(d.estado)}`}
                        />
                      </ListItem>
                    ))}
                    {resultados.length === 0 && (
                      <ListItem>
                        <ListItemText primary="Sin resultados para esa búsqueda." />
                      </ListItem>
                    )}
                  </List>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>

    {/* SECCIÓN JSX: tabla de documentos procesados (id preexistente conservado).
        DATOS QUE SE MANDAN A ../Components/TablaGeneral.jsx para procesamiento: datos={tablaDocs} (reales). */}
    <Box id="ContenedorTabla" sx={{width: '99%'}}>
      <Typography variant="h6" fontWeight="bold" sx={{mt:5,mb:3, color:'text.secondary'}}>
        Documentos procesados
      </Typography>
    <TablaGeneral datos={tablaDocs}/>

    </Box>



    </Box>



  );
}

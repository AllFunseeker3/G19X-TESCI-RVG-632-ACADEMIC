/* ============================================================================
 * ARCHIVO: src/Pages/plantillas.jsx
 * FUNCIÓN GENERAL: Galería de plantillas (una tarjeta por tipo de documento).
 *   - Agrupa por CATEGORIAS y lista TIPOS_POR_CATEGORIA con su conteo de
 *     campos (CAMPOS_POR_TIPO).
 *   - Botón "Usar plantilla" abre GenerarCarta con categoría/tipo preseleccionados.
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE):
 *     -> ../lib/tiposDocumentos.js: CATEGORIAS, TIPOS_POR_CATEGORIA, CAMPOS_POR_TIPO.
 *     -> app.jsx: monta esta página en "/Plantillas" dentro de DashBoardLayout.
 *   - SALEN (DATOS QUE SE MANDAN A <archivo> para procesamiento):
 *     -> GenerarCarta.jsx (ruta /Menu): URL `/Menu?categoria=${cat.id}&tipo=${t.id}`;
 *        GenerarCarta lee esos params con useSearchParams y precarga el formulario.
 * QUÉ MODIFICAR SI hay cambios:
 *   - Catálogo: edita ../lib/tiposDocumentos.js (no este archivo).
 *   - Formato del link: ajusta el `to={...}` y en espejo la lectura de params
 *     en GenerarCarta.jsx.
 *   - Estilos: ids "Box-Plantillas-*" (preexistentes con espacios conservados).
 * No se cambió lógica ni JSX, solo comentarios e id faltante.
 * ========================================================================== */
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
} from "@mui/material";
import DescriptionIcon from "@mui/icons-material/Description";
import { Link } from "react-router-dom";
import PageHeader from "../Components/PageHeader";
// DATOS PROVENIENTES DE ../lib/tiposDocumentos.js: catálogo de categorías, tipos y campos.
import {
  CATEGORIAS,
  TIPOS_POR_CATEGORIA,
  CAMPOS_POR_TIPO,
} from "../lib/tiposDocumentos";
// PERMISOS: filtra categorías y deshabilita "Usar plantilla" sin crear.
import { usePermisos } from "../Components/PermisosProvider";

// QUÉ HACE: galería de plantillas agrupada por categoría.
// DÓNDE SE USA: ruta "/Plantillas" en app.jsx; enlazada desde Inicio (acceso directo).
// QUÉ MODIFICAR SI: cambia el catálogo, edita ../lib/tiposDocumentos.js.
// Galería de plantillas: una tarjeta por tipo de documento.
// "Usar plantilla" abre GenerarCarta con la categoría y el tipo preseleccionados.
export default function Plantillas() {
  // Solo categorías con permiso de ver (sin datos aún: todas; el back decide).
  const { listo, puede } = usePermisos();
  const cats = listo
    ? CATEGORIAS.filter((c) => puede(c.id, "ver"))
    : CATEGORIAS;
  return (
    // SECCIÓN JSX: contenedor raíz + encabezado (id preexistente conservado).
    <Box id="Contenedor de plantillas" sx={{ p: 2, width: "100%" }}>
      <PageHeader
        id="Encabezado de plantillas"
        titulo="Plantillas de documentos"
        subtitulo="Elige una plantilla para generar un documento con sus datos precargados."
      />

      {/* SECCIÓN JSX: un grupo por categoría PERMITIDA (id preexistente conservado). */}
      {cats.map((cat) => (
        <Box
          key={cat.id}
          id={`Grupo de plantillas ${cat.nombre}`}
          sx={{ mb: 4 }}
        >
          <Typography
            variant="h6"
            fontWeight="bold"
            color="encabezado.main"
            sx={{ mb: 2 }}
          >
            {cat.nombre}
          </Typography>
          <Grid container spacing={3}>
            {/* SECCIÓN JSX: una tarjeta por tipo. numCampos solo cuenta campos del catálogo. */}
            {TIPOS_POR_CATEGORIA[cat.id].map((t) => {
              // CÁLCULO: número de datos solicitados de la plantilla.
              // DATOS PROVENIENTES DE ../lib/tiposDocumentos.js (CAMPOS_POR_TIPO).
              const numCampos = (CAMPOS_POR_TIPO[t.id] ?? []).length;
              return (
                <Grid item xs={12} sm={6} md={4} key={t.id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      borderRadius: 2,
                      transition: "transform .15s, box-shadow .15s",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: 4,
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      {/* SECCIÓN JSX: encabezado de la tarjeta (icono + nombre del tipo). */}
                      <Box
                        id="Box-Plantillas-TarjetaEncabezado"
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          mb: 1,
                        }}
                      >
                        <DescriptionIcon
                          sx={{ color: "encabezado.main", fontSize: 36 }}
                        />
                        <Typography variant="h6" fontWeight="bold">
                          {t.nombre}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Plantilla parametrizada con {numCampos} datos
                        solicitados, lista para generar y enviar a revisión.
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 2, pt: 0 }}>
                      {/* BOTÓN: DATOS QUE SE MANDAN A GenerarCarta.jsx para procesamiento
                                                vía URL ?categoria=&tipo=. Deshabilitado sin permiso de crear.
                                                QUÉ MODIFICAR SI: cambia el formato, actualiza useSearchParams
                                                en GenerarCarta.jsx. */}
                      <Button
                        variant="contained"
                        color="primary"
                        component={Link}
                        to={`/Menu?categoria=${cat.id}&tipo=${t.id}`}
                        disabled={!puede(cat.id, "crear")}
                        title={
                          puede(cat.id, "crear")
                            ? "Usar plantilla"
                            : "Sin permiso de crear"
                        }
                      >
                        Usar plantilla
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}

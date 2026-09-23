/* ============================================================================
 * ARCHIVO: src/Pages/Usuarios.jsx
 * FUNCIÓN GENERAL: página "Usuarios" (administración, solo quien gestiona).
 *   - Pinta el encabezado y monta Components/UsuariosAdmin.jsx con las
 *     pestañas Usuario nuevo / Ver usuarios.
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE): app.jsx la monta en "/Usuarios"
 *     dentro de DashBoardLayout (ruta protegida, solo con token).
 *   - SALEN (DATOS QUE SE MANDAN A <archivo> para procesamiento):
 *     -> Components/UsuariosAdmin.jsx: panel completo (lee API usuarios).
 * QUÉ MODIFICAR SI hay cambios: el panel vive en UsuariosAdmin.jsx; aquí
 *   solo cambia el encabezado o el contenedor (id="Box-Usuarios-Contenedor").
 * ========================================================================== */
import { Box } from "@mui/material";
import PageHeader from "../Components/PageHeader";
import UsuariosAdmin from "../Components/UsuariosAdmin";

// QUÉ HACE: página contenedora de administración de usuarios.
// DÓNDE SE USA: ruta "/Usuarios" en app.jsx (protegida + layout).
export default function Usuarios() {
  return (
    // SECCIÓN JSX: contenedor raíz de la página.
    <Box id="Box-Usuarios-Contenedor" sx={{ p: 2, width: "100%" }}>
      <PageHeader
        id="Encabezado de usuarios"
        titulo="Usuarios"
        subtitulo="Crea usuarios y gestiona accesos, roles y bajas."
      />
      {/* PANEL: pestañas Usuario nuevo / Ver usuarios (ver UsuariosAdmin.jsx). */}
      <UsuariosAdmin />
    </Box>
  );
}

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

// ============ AQUÍ EMPIEZA PÁGINA USUARIOS ============
// QUÉ HACE: página contenedora de administración de usuarios.
// DÓNDE SE USA: ruta "/Usuarios" en app.jsx (protegida + layout).
export default function Usuarios() {
  return (
    // SECCIÓN JSX: contenedor raíz de la página.
    // ============ AQUÍ EMPIEZA CONTENEDOR USUARIOS ============
    <Box id="Box-Usuarios-Contenedor" sx={{ p: 2, width: "100%" }}>
      {/* ============ AQUÍ EMPIEZA ENCABEZADO USUARIOS ============ */}
      <PageHeader
        id="Encabezado de usuarios"
        titulo="Usuarios"
        subtitulo="Crea usuarios y gestiona accesos, roles y bajas."
      />
      {/* ============ AQUÍ TERMINA ENCABEZADO USUARIOS ============ */}
      {/* ============ AQUÍ EMPIEZA PANEL ADMIN USUARIOS ============ */}
      {/* PANEL: pestañas Usuario nuevo / Ver usuarios (ver UsuariosAdmin.jsx). */}
      <UsuariosAdmin />
      {/* ============ AQUÍ TERMINA PANEL ADMIN USUARIOS ============ */}
    </Box>
    // ============ AQUÍ TERMINA CONTENEDOR USUARIOS ============
  );
}
// ============ AQUÍ TERMINA PÁGINA USUARIOS ============

/* ============================================================================
 * ARCHIVO: src/Components/EstadoConexion.jsx
 * FUNCIÓN GENERAL: aviso del estado de la conexión con el back-end (MariaDB).
 *   Al montar, llama GET /api/salud:
 *   - OK -> Snackbar verde "Conexión correcta..." (se oculta solo).
 *   - Falla -> alerta roja fija con botón Reintentar.
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE): ../lib/api.js -> getSalud().
 *   - SALEN: nada (solo visual). Si falla, api.js ya disparó
 *     'sislegal:sin-conexion' y app.jsx te lleva a /Ingreso.
 * PROPS:
 *   - soloError (bool, default false): en true solo muestra fallas
 *     (úsalo dentro del layout para no repetir el aviso de éxito).
 * QUÉ MODIFICAR SI hay cambios: tiempos de autoHide o textos aquí mismo.
 * ========================================================================== */
import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Snackbar } from "@mui/material";
import { getSalud } from "../lib/api.js";

// QUÉ HACE: verifica la conexión al montar y muestra el aviso.
// DÓNDE SE USA: Pages/Ingreso.jsx (aviso completo) y
//   Components/DashboardLayout.jsx (soloError para fallas dentro de la app).
// ============ AQUÍ EMPIEZA COMPONENTE EstadoConexion ============
export default function EstadoConexion({ soloError = false }) {
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error
  const [version, setVersion] = useState(""); // Versión MariaDB del /salud.
  const [abierto, setAbierto] = useState(true); // Visibilidad del Snackbar.

  // ============ AQUÍ EMPIEZA HANDLER verificar ============
  // HANDLER: pregunta al back (GET /api/salud). Actualiza estado/version.
  const verificar = useCallback(async () => {
    setAbierto(true);
    try {
      const s = await getSalud();
      setVersion(s.mariadb ?? "");
      setEstado("ok");
    } catch {
      setEstado("error");
      setAbierto(true);
    }
  }, []);
  // ============ AQUÍ TERMINA HANDLER verificar ============

  // ============ AQUÍ EMPIEZA EFFECT verificación inicial ============
  // Al montar verifica una vez (en timeout para no setear estado en el effect).
  useEffect(() => {
    const t = setTimeout(verificar, 0);
    return () => clearTimeout(t);
  }, [verificar]);
  // ============ AQUÍ TERMINA EFFECT verificación inicial ============

  // Mientras verifica o si todo ok en modo soloError: no pinta nada.
  if (estado === "cargando") return null;
  if (estado === "ok" && soloError) return null;

  // ============ AQUÍ EMPIEZA AVISO Snackbar + Alert ============
  return (
    <Snackbar
      id="Box-EstadoConexion-Aviso"
      open={abierto}
      // El éxito se oculta solo a los 6s; el error queda hasta Reintentar.
      autoHideDuration={estado === "ok" ? 6000 : null}
      onClose={(_e, motivo) => {
        if (motivo !== "clickaway") setAbierto(false);
      }}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert
        severity={estado === "ok" ? "success" : "error"}
        variant="filled"
        onClose={() => setAbierto(false)}
        action={
          estado === "error" ? (
            <Button color="inherit" size="small" onClick={verificar}>
              Reintentar
            </Button>
          ) : undefined
        }
      >
        {estado === "ok"
          ? `Conexión correcta con la base de datos${version ? ` (${version})` : ""}`
          : "Sin conexión con el servidor. Revisa que el backend esté corriendo."}
      </Alert>
    </Snackbar>
  );
}
// ============ AQUÍ TERMINA AVISO Snackbar + Alert ============
// ============ AQUÍ TERMINA COMPONENTE EstadoConexion ============

/* eslint-disable react-refresh/only-export-components -- el hook usePermisos vive junto a su provider a propósito */
/* ============================================================================
 * ARCHIVO: src/Components/PermisosProvider.jsx
 * FUNCIÓN GENERAL: permisos del usuario logueado para mostrar/ocultar secciones.
 *   Al montar pide GET /api/usuarios/yo/permisos y expone puede(cat, acción).
 *   Sin token o si falla: permite todo (el back-end es quien bloquea de verdad).
 * FLUJO DE DATOS:
 *   - ENTRAN (DATOS PROVENIENTES DE): ../lib/api.js -> getMisPermisos(),
 *     leerToken(). Tablas permisos_rol/roles vía server/routes/usuarios.js.
 *   - SALEN (DATOS QUE SE MANDAN A <archivo> para procesamiento):
 *     -> Components/DashboardLayout.jsx: oculta menú sin permiso.
 *     -> Pages/GenerarCarta.jsx y plantillas.jsx: filtran categorías.
 * QUÉ MODIFICAR SI hay cambios: acciones válidas ('ver'|'crear'|'modificar'|
 *   'eliminar'|'gestionar') o la ruta de permisos, aquí mismo.
 * ========================================================================== */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getMisPermisos, leerToken } from "../lib/api.js";

// ============ AQUÍ EMPIEZA CONTEXTO + HOOK usePermisos ============
const PermisosContext = createContext(null);

// Hook para consultar permisos desde menú y páginas. Ej: puede('oficios', 'crear').
export function usePermisos() {
  const ctx = useContext(PermisosContext);
  if (!ctx)
    throw new Error("usePermisos debe usarse dentro de <PermisosProvider>");
  return ctx;
}
// ============ AQUÍ TERMINA CONTEXTO + HOOK usePermisos ============

// ============ AQUÍ EMPIEZA PROVIDER PermisosProvider ============
// Proveedor: va DENTRO del layout (solo zona autenticada). Ver DashboardLayout.
export default function PermisosProvider({ children }) {
    const [datos, setDatos] = useState(null); // { admin, id_area, permisos: [...] }
    // Sin token (login) arranca listo; con token espera al fetch (ver effect).
    const [listo, setListo] = useState(() => !leerToken());

    // ============ AQUÍ EMPIEZA EFFECT carga de permisos ============
    // CARGA: una vez al montar si hay token (callbacks async, no set directo).
    useEffect(() => {
        if (!leerToken()) return;
        let vivo = true;
        getMisPermisos()
      .then((d) => {
        if (vivo) setDatos(d);
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setListo(true);
      });
    return () => {
      vivo = false;
    };
  }, []);
  // ============ AQUÍ TERMINA EFFECT carga de permisos ============

  // ============ AQUÍ EMPIEZA CONSULTAS puede/algunaCon ============
  // CONSULTA: ¿tiene este permiso? Sin datos (o admin) = abierto; el back decide.
  const puede = useCallback(
    (categoria, accion = "ver") => {
      if (!datos) return true;
      if (datos.admin) return true;
      if (categoria === "*") {
        return datos.permisos.some((p) => {
          const mapa = {
            ver: "puede_ver",
            crear: "puede_crear",
            modificar: "puede_modificar",
            eliminar: "puede_eliminar",
            gestionar: "puede_gestionar",
          };
          return Boolean(p[mapa[accion] ?? "puede_ver"]);
        });
      }
      const fila = datos.permisos.find((p) => p.categoria === categoria);
      if (!fila) return false;
      const mapa = {
        ver: "puede_ver",
        crear: "puede_crear",
        modificar: "puede_modificar",
        eliminar: "puede_eliminar",
        gestionar: "puede_gestionar",
      };
      return Boolean(fila[mapa[accion] ?? "puede_ver"]);
    },
    [datos],
  );

  // CONSULTA: ¿tiene esta acción en AL MENOS una categoría? (para el menú).
  const algunaCon = useCallback(
    (accion = "ver") => {
      if (!datos) return true;
      if (datos.admin) return true;
      return datos.permisos.some((p) => puede(p.categoria, accion));
    },
    [datos, puede],
  );
  // ============ AQUÍ TERMINA CONSULTAS puede/algunaCon ============

  // ============ AQUÍ EMPIEZA VALOR MEMO + PROVIDER ============
  const valor = useMemo(
    () => ({
      admin: datos ? Boolean(datos.admin) : true,
      listo,
      puede,
      algunaCon,
    }),
    [datos, listo, puede, algunaCon],
  );

  return (
    <PermisosContext.Provider value={valor}>
      {children}
    </PermisosContext.Provider>
  );
}
// ============ AQUÍ TERMINA VALOR MEMO + PROVIDER ============
// ============ AQUÍ TERMINA PROVIDER PermisosProvider ============

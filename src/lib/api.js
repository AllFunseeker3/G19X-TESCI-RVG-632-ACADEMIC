// ============================================================================
// ARCHIVO: src/lib/api.js
// FUNCIÓN GENERAL: cliente HTTP del front hacia la API SisLegal (server/
//   Express + MariaDB, misma superficie que el backend FastAPI de referencia).
//   Guarda el JWT en localStorage ('sislegal-token') y lo manda como Bearer.
// FLUJO DE DATOS:
//   - ENTRAN: VITE_API_URL de .env (default http://localhost:8000/api).
//   - SALEN (DATOS QUE SE MANDAN A <archivo> para procesamiento):
//     -> server/routes/*.js: login, catalogo, documentos, usuarios.
// QUÉ MODIFICAR SI hay cambios: BASE (URL) o CLAVE_TOKEN aquí mismo;
//   para un endpoint nuevo, agrega una función que use api().
// ============================================================================

// URL base del back-end (ver .env.example). Sin .env, apunta al dev local.
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const CLAVE_TOKEN = "sislegal-token";
// Usuario logueado { id, nombre, correo, rol, id_rol, id_area } (lo da /auth/login).
const CLAVE_USUARIO = "sislegal-usuario";

// Eventos globales que escucha app.jsx (VigilanteSesion):
//  - 'sislegal:sin-conexion': el servidor no responde (apagado o caído).
//  - 'sislegal:sesion-expirada': el back devolvió 401 (token inválido/vencido).
// En ambos casos la app regresa a /Ingreso para loguearse de nuevo.
export const EVENTO_SIN_CONEXION = "sislegal:sin-conexion";
export const EVENTO_SESION_EXPIRADA = "sislegal:sesion-expirada";

// QUÉ HACE: lee el JWT guardado (o null si no hay sesión).
export const leerToken = () => window.localStorage.getItem(CLAVE_TOKEN);

// QUÉ HACE: guarda/borra el JWT (login/logout). Al borrar también sale el usuario.
export const guardarToken = (t) => {
  if (t) window.localStorage.setItem(CLAVE_TOKEN, t);
  else {
    window.localStorage.removeItem(CLAVE_TOKEN);
    window.localStorage.removeItem(CLAVE_USUARIO);
  }
};

// QUÉ HACE: guarda el usuario del login (para mostrar su nombre en la UI).
export const guardarUsuario = (u) => {
  if (u) window.localStorage.setItem(CLAVE_USUARIO, JSON.stringify(u));
  else window.localStorage.removeItem(CLAVE_USUARIO);
};

// QUÉ HACE: lee el usuario guardado (o null). Lo usan el layout y el Inicio.
export const leerUsuario = () => {
  try {
    const raw = window.localStorage.getItem(CLAVE_USUARIO);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// QUÉ HACE: fetch con JSON + Bearer automáticos. Lanza Error con el
// detalle del back si el status no es 2xx (el front lo muestra al usuario).
// Si no hay red/servidor: avisa 'sislegal:sin-conexion' (app.jsx te manda a
// /Ingreso). Si el back da 401: borra el token y avisa 'sislegal:sesion-expirada'.
async function api(ruta, { metodo = "GET", cuerpo, token } = {}) {
  const t = token ?? leerToken();
  let res;
  try {
    res = await fetch(`${BASE}${ruta}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    window.dispatchEvent(new Event(EVENTO_SIN_CONEXION));
    throw new Error("Sin conexión con el servidor");
  }
  const datos = await res.json().catch(() => ({}));
  if (res.status === 401) {
    guardarToken(null);
    window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
    throw new Error(datos.detail ?? "Sesión expirada, ingresa de nuevo");
  }
  if (!res.ok) throw new Error(datos.detail ?? `Error ${res.status}`);
  return datos;
}

// --- Auth (backend/app/routers/auth.py) ---
export const login = (correo, contrasena) =>
  api("/auth/login", { metodo: "POST", cuerpo: { correo, contrasena } });

// --- Catálogo (backend/app/routers/catalogo.py): Campo 1, Campo 2 y campos ---
export const getCategorias = () => api("/catalogo/categorias");
export const getTipos = (categoria) =>
  api(`/catalogo/tipos?categoria=${encodeURIComponent(categoria)}`);
export const getCampos = (idTipo) =>
  api(`/catalogo/tipos/${encodeURIComponent(idTipo)}/campos`);

// --- Documentos (backend/app/routers/documentos.py) ---
export const getDocumentos = (params = {}) => {
  const q = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
    ),
  ).toString();
  return api(`/documentos${q ? `?${q}` : ""}`);
};
export const getDocumento = (id) => api(`/documentos/${id}`);
export const getActividad = (limite = 6) =>
  api(`/documentos/actividad/reciente?limite=${limite}`);
export const crearDocumento = (payload) =>
  api("/documentos", { metodo: "POST", cuerpo: payload });
export const cambiarEstado = (id, estado, comentario) =>
  api(`/documentos/${id}/estado`, {
    metodo: "PATCH",
    cuerpo: { estado, comentario },
  });
export const agregarAdjunto = (id, adjunto) =>
  api(`/documentos/${id}/adjuntos`, { metodo: "POST", cuerpo: adjunto });

// --- Usuarios (backend/app/routers/usuarios.py) ---
export const getMisPermisos = () => api("/usuarios/yo/permisos");
export const getUsuarios = () => api("/usuarios");
export const getUsuario = (id) => api(`/usuarios/${id}`);
export const getRoles = () => api("/usuarios/roles");
export const getAreas = () => api("/usuarios/areas");
export const getPuestos = () => api("/usuarios/puestos");
export const getUsuariosYoPermisos = () => api("/usuarios/yo/permisos");
export const crearUsuario = (payload) =>
  api("/usuarios", { metodo: "POST", cuerpo: payload });
export const actualizarUsuario = (id, payload) =>
  api(`/usuarios/${id}`, { metodo: "PATCH", cuerpo: payload });
// Prende/apaga un permiso del ROL (afecta a todos los usuarios con ese rol).
export const actualizarPermisoRol = (idRol, categoria, accion, valor) =>
  api(`/usuarios/roles/${idRol}/permisos`, {
    metodo: "PATCH",
    cuerpo: { categoria, accion, valor },
  });
export const bajaUsuario = (id) =>
  api(`/usuarios/${id}`, { metodo: "DELETE" });

// --- Salud (sin auth): ping a MariaDB + conteos ---
export const getSalud = () => api("/salud");

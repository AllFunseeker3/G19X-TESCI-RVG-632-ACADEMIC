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
// ============ AQUÍ EMPIEZA CONFIG BASE Y TOKEN ============
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const CLAVE_TOKEN = "sislegal-token";
// Usuario logueado { id, nombre, correo, rol, id_rol, id_area } (lo da /auth/login).
const CLAVE_USUARIO = "sislegal-usuario";

// Eventos globales que escucha app.jsx (VigilanteSesion):
//  - 'sislegal:sin-conexion': el servidor no responde (apagado o caído).
//  - 'sislegal:sesion-expirada': el back devolvió 401 (token inválido/vencido).
// En ambos casos la app regresa a /Ingreso para loguearse de nuevo.
// ============ AQUÍ TERMINA CONFIG BASE Y TOKEN ============

// ============ AQUÍ EMPIEZA HELPERS DE SESIÓN (token/usuario) ============
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
// ============ AQUÍ TERMINA HELPERS DE SESIÓN (token/usuario) ============

// ============ AQUÍ EMPIEZA NÚCLEO FETCH api() ============
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
// ============ AQUÍ TERMINA NÚCLEO FETCH api() ============

// ============ AQUÍ EMPIEZA AUTH ============
// --- Auth (backend/app/routers/auth.py) ---
export const login = (correo, contrasena) =>
  api("/auth/login", { metodo: "POST", cuerpo: { correo, contrasena } });
// ============ AQUÍ TERMINA AUTH ============

// ============ AQUÍ EMPIEZA DOCUMENTOS ============
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
export const crearDocumento = (payload) =>
  api("/documentos", { metodo: "POST", cuerpo: payload });
// Corrige los datos de un doc propio en revisión/rechazado (vuelve a revisión).
export const actualizarDocumento = (id, payload) =>
  api(`/documentos/${id}/datos`, { metodo: "PATCH", cuerpo: payload });
export const cambiarEstado = (id, estado, comentario) =>
  api(`/documentos/${id}/estado`, {
    metodo: "PATCH",
    cuerpo: { estado, comentario },
  });
export const agregarAdjunto = (id, adjunto) =>
  api(`/documentos/${id}/adjuntos`, { metodo: "POST", cuerpo: adjunto });
export const eliminarDocumento = (id) =>
  api(`/documentos/${id}`, { metodo: "DELETE" });
// ============ AQUÍ TERMINA DOCUMENTOS ============

// ============ AQUÍ EMPIEZA USUARIOS ============
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
// ============ AQUÍ TERMINA USUARIOS ============

// ============ AQUÍ EMPIEZA IA Y PDF ============
// --- IA (server/routes/ia.js -> ai-service FastAPI + OpenRouter) ---
// Redacta el documento con IA a partir del tipo y los datos capturados.
export const redactarConIA = (idTipo, datos) =>
  api("/ia/redactar", { metodo: "POST", cuerpo: { id_tipo: idTipo, datos } });
// Corrige el texto del preview con la retro del usuario (sin regenerar desde cero).
export const corregirConIA = (contenido, instruccion, idTipo = "") =>
  api("/ia/corregir", { metodo: "POST", cuerpo: { contenido, instruccion, id_tipo: idTipo } });
// Genera el PDF institucional en documentos/Sistema legal (+ adjunto si hay id).
export const generarPDF = (idTipo, datos, idDocumento = null, contenido = '') =>
  api("/ia/pdf", { metodo: "POST", cuerpo: { id_tipo: idTipo, datos, contenido, id_documento: idDocumento } });
// Descarga el PDF generado (devuelve Blob para abrir/descargar).
export const descargarPDF = async (archivo) => {
  const t = leerToken();
  const res = await fetch(`${BASE}/ia/pdf/${encodeURIComponent(archivo)}`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
  if (!res.ok) throw new Error("No se pudo descargar el PDF");
  return res.blob();
};
// Revisa un PDF externo con IA: lo clasifica entre los 11 tipos, extrae
// datos y devuelve veredicto + hallazgos (no crea documentos).
export const revisarPDFconIA = async (file) => {
  const t = leerToken();
  const fd = new FormData();
  fd.append("archivo", file);
  let res;
  try {
    res = await fetch(`${BASE}/ia/revisar`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: fd,
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
};
// ============ AQUÍ TERMINA IA Y PDF ============

// ============ AQUÍ EMPIEZA CLIENTES ============
// --- Directorio (server/routes/clientes.js): personas/empresas con verificación.
// Alta/edición de cualquiera con escritura; verificar/baja solo admin/super.
export const getClientes = (soloPendientes = false) =>
  api(`/clientes${soloPendientes ? "?solo_pendientes=1" : ""}`);
export const crearCliente = (payload) =>
  api("/clientes", { metodo: "POST", cuerpo: payload });
export const actualizarCliente = (id, payload) =>
  api(`/clientes/${id}`, { metodo: "PATCH", cuerpo: payload });
export const verificarCliente = (id, verificado = true) =>
  api(`/clientes/${id}/verificar`, { metodo: "PATCH", cuerpo: { verificado } });
export const bajaCliente = (id) =>
  api(`/clientes/${id}`, { metodo: "DELETE" });
// ============ AQUÍ TERMINA CLIENTES ============

// ============ AQUÍ EMPIEZA NOTIFICACIONES ============
// --- Campanita (server/routes/notificaciones.js): avisos de creación para
// supers del área + admins. El badge cuenta las no leídas.
export const getNotificaciones = (limite = 10, soloNoLeidas = false) => {
  const q = new URLSearchParams({ limite: String(limite) });
  if (soloNoLeidas) q.set("solo_no_leidas", "1");
  return api(`/notificaciones?${q.toString()}`);
};
export const marcarNotificacionLeida = (id) =>
  api(`/notificaciones/${id}/leida`, { metodo: "PATCH" });
export const marcarTodasLeidas = () =>
  api("/notificaciones/leer-todas", { metodo: "PATCH" });
// ============ AQUÍ TERMINA NOTIFICACIONES ============

// ============ AQUÍ EMPIEZA SALUD ============
// --- Salud (sin auth): ping a MariaDB + conteos ---
export const getSalud = () => api("/salud");
// ============ AQUÍ TERMINA SALUD ============

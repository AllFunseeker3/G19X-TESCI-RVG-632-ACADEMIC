/* ============================================================================
 * ARCHIVO: src/Components/UsuariosAdmin.jsx
 * FUNCIÓN GENERAL: panel de administración de usuarios (solo quien gestiona).
 *   - Pestaña "Nuevo usuario": nombre libre + email auto 3+3+3 + pass genérica,
 *     con rol/área traídos de la API y filtrados por alcance.
 *   - Pestaña "Ver usuarios": tabla + detalle con matriz de permisos,
 *     cambio de rol (quita/da permisos), baja lógica y reactivación.
 * FLUJO DE DATOS:
 *   - ENTRAN: usePermisos() (visibilidad) + ../lib/api.js -> getUsuarios,
 *     getRoles, getAreas, crearUsuario, getUsuario, actualizarUsuario,
 *     bajaUsuario (server/routes/usuarios.js).
 *   - SALEN: altas/cambios/bajas a la API (el back valida área y rol).
 * QUÉ MODIFICAR SI hay cambios: validaciones del formulario o columnas,
 *   aquí mismo. Reglas de alcance: server/routes/usuarios.js.
 * ========================================================================== */
import { useState, useEffect } from "react";
import {
  Box, Typography, Button, TextField, InputLabel, FormControl,
  FormControlLabel, Switch, Select, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Tooltip,
  Tabs, Tab, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, Card, CardContent, Stack
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import {
  getUsuarios, getRoles, getAreas, getPuestos, crearUsuario,
  getUsuario, actualizarUsuario, actualizarPermisoRol, bajaUsuario,
} from "../lib/api.js";
import { usePermisos } from "./PermisosProvider.jsx";
import SeccionFormulario from "./SeccionFormulario.jsx";
import Etiqueta from "./Etiqueta.jsx";

// QUÉ HACE: genera correo automático 3+3+3 letras, sin acentos (igual que el back).
function generarCorreo(nombre) {
  if (!nombre) return "";
  const sinAcentos = String(nombre).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const partes = sinAcentos.trim().split(/\s+/);
  if (partes.length < 2) return "";
  const n = partes[0].substring(0, 3).toLowerCase();
  const p = partes[1].substring(0, 3).toLowerCase();
  const m = partes.length > 2 ? partes[2].substring(0, 3).toLowerCase() : "xxx";
  return `${n}${p}${m}@sislegal.mx`;
}

const FORM_VACIO = {
  nombre: "", paterno: "", materno: "",
  id_rol: "", id_area: "", puesto: "", telefono: "", fecha_ingreso: "",
};

export default function UsuariosAdmin() {
  // Solo quien gestiona ve el panel (el menú ya lo oculta; esto es doble seguro).
  const { listo, puede, admin } = usePermisos();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [areas, setAreas] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState(0); // 0 = nuevo, 1 = ver
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [form, setForm] = useState(FORM_VACIO);
  const [detalle, setDetalle] = useState(null); // Usuario + permisos + rol editable
  const [nuevoRol, setNuevoRol] = useState("");
  const [confirmarBaja, setConfirmarBaja] = useState(null);
  const [permisoEnCurso, setPermisoEnCurso] = useState(null); // "categoria:accion" mientras guarda

  // CARGA inicial: usuarios (crítico) + catálogos (tolerante: si el server
  // está desactualizado y no trae roles/áreas, la tabla igual se muestra).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const u = await getUsuarios();
        if (vivo) setUsuarios(u);
      } catch (e) {
        if (vivo) setError(e.message);
      }
      try {
        const [r, a, p] = await Promise.all([getRoles(), getAreas(), getPuestos()]);
        if (!vivo) return;
        setRoles(r);
        setAreas(a);
        setPuestos(p);
        // Si hay una sola área (super), preseleccionarla.
        if (a.length === 1) setForm((f) => ({ ...f, id_area: String(a[0].id) }));
      } catch {
        if (vivo) setError("Catálogos (roles/áreas/puestos) no disponibles: reinicia el servidor (npm run todo).");
      } finally {
        if (vivo) setCargando(false);
      }
    })();
    return () => { vivo = false; };
  }, []);

  const recargar = async () => {
    try {
      setUsuarios(await getUsuarios());
    } catch (e) {
      setError(e.message);
    }
  };

  // Roles ofrecidos: los gestores (superusuarios) solo los ve el admin
  // (diálogo de detalle). En el formulario de alta no se listan: se usa el
  // switch "¿Es superusuario?" que mapea al super de la misma área.
  // (El login no trae flag admin en localStorage; se usa el del provider,
  // que viene de GET /api/usuarios/yo/permisos. El back valida de todos modos.)
  const rolesOfrecidos = roles.filter((r) => {
    if (r.es_gestor) return Boolean(admin);
    return true;
  });

  // Selector del formulario: solo roles base (Legal / Operativo / Administrador).
  // El super se elige con el switch y se mapea al rol gestor de la misma área.
  const rolesBase = roles.filter((r) => !r.es_gestor);
  const [esSuper, setEsSuper] = useState(false);
  const rolBaseElegido = rolesBase.find((r) => String(r.id) === String(form.id_rol));
  const rolSuperDe = (idBase) => {
    const base = rolesBase.find((r) => String(r.id) === String(idBase));
    if (!base || !base.id_area) return null;
    return roles.find((r) => r.es_gestor && String(r.id_area) === String(base.id_area)) ?? null;
  };
  const superDisponible = Boolean(admin && rolSuperDe(form.id_rol));
  const rolFinal = superDisponible && esSuper ? rolSuperDe(form.id_rol) : rolBaseElegido ?? null;

  const handleRolBase = (e) => {
    const id = e.target.value;
    setForm((f) => {
      const copia = { ...f, id_rol: id };
      // Si el nuevo rol base tiene super de otra área, ajusta el área.
      const sup = rolSuperDe(id);
      if (esSuper && sup) copia.id_area = String(sup.id_area);
      return copia;
    });
    if (!rolSuperDe(id)) setEsSuper(false);
  };

  const handleEsSuper = (e) => {
    const marcado = e.target.checked;
    setEsSuper(marcado);
    const sup = rolSuperDe(form.id_rol);
    if (marcado && sup) setForm((f) => ({ ...f, id_area: String(sup.id_area) }));
  };

  // Vista previa del correo auto (3+3+3) según lo capturado.
  const emailPreview = generarCorreo(
    `${form.nombre} ${form.paterno} ${form.materno}`.trim()
  );

  // ALTA: nombre compuesto + rol/área/datos. El back genera email y pass genérica.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setExito("");
    if (!form.nombre.trim() || !form.paterno.trim()) {
      setError("Escribe al menos nombre(s) y apellido paterno.");
      return;
    }
    if (!form.id_rol) {
      setError("Selecciona el rol.");
      return;
    }
    try {
      const data = await crearUsuario({
        nombre: `${form.nombre.trim()} ${form.paterno.trim()} ${form.materno.trim()}`.trim(),
        id_rol: Number(rolFinal?.id ?? form.id_rol),
        id_area: form.id_area === "" ? null : Number(form.id_area),
        puesto: form.puesto.trim() || null,
        telefono: form.telefono.trim() || null,
        fecha_ingreso: form.fecha_ingreso || null,
      });
      setExito(`Usuario creado (${data.correo}) con pass: ${data.contrasena}`);
      setForm({ ...FORM_VACIO, id_area: areas.length === 1 ? String(areas[0].id) : "" });
      setEsSuper(false);
      recargar();
    } catch (e2) {
      setError(e2.message);
    }
  };

  // DETALLE: trae usuario + matriz de permisos y prepara el rol editable.
  const verDetalle = async (id) => {
    try {
      const d = await getUsuario(id);
      setDetalle(d);
      setNuevoRol(String(d.id_rol));
    } catch (e) {
      setError(e.message);
    }
  };

  // CAMBIO DE ROL: quita/da permisos efectivos (el back valida alcance).
  const guardarRol = async () => {
    if (!detalle || nuevoRol === String(detalle.id_rol)) return;
    try {
      await actualizarUsuario(detalle.id, { id_rol: Number(nuevoRol) });
      setExito("Rol actualizado (permisos efectivos cambiados)");
      setDetalle(null);
      recargar();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleReactivar = async (id) => {
    try {
      await actualizarUsuario(id, { activo: 1 });
      setExito("Usuario reactivado");
      setDetalle(null);
      recargar();
    } catch (e) {
      setError(e.message);
    }
  };

  // TOGGLE DE PERMISO: prende/apaga un permiso del ROL del usuario en el
  // diálogo (afecta a TODOS los usuarios con ese rol). El back valida alcance.
  const ACCIONES_PERMISO = [
    { accion: "ver", clave: "puede_ver" },
    { accion: "crear", clave: "puede_crear" },
    { accion: "modificar", clave: "puede_modificar" },
    { accion: "eliminar", clave: "puede_eliminar" },
    { accion: "gestionar", clave: "puede_gestionar" },
  ];
  const togglePermiso = async (categoria, accion, clave, valorActual) => {
    if (!detalle || permisoEnCurso) return;
    const llave = `${categoria}:${accion}`;
    setPermisoEnCurso(llave);
    try {
      await actualizarPermisoRol(detalle.id_rol, categoria, accion, !valorActual);
      setDetalle((d) => ({
        ...d,
        permisos: d.permisos.map((p) =>
          p.categoria === categoria ? { ...p, [clave]: !valorActual } : p
        ),
      }));
      setExito(`Permiso ${accion} ${!valorActual ? "otorgado" : "quitado"} en ${categoria} (rol ${detalle.rol})`);
    } catch (e) {
      setError(e.message);
    } finally {
      setPermisoEnCurso(null);
    }
  };

  if (!listo) return null;
  if (!puede("*", "gestionar")) return null;

  return (
    <Box sx={{ p: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {exito && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setExito("")}>{exito}</Alert>}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root.Mui-selected': { color: 'encabezado.main' }, '& .MuiTabs-indicator': { bgcolor: 'encabezado.main' } }}>
        <Tab label="Usuario nuevo" icon={<AddIcon />} />
        <Tab label="Ver usuarios" icon={<VisibilityIcon />} />
      </Tabs>

      {/* ============ AQUÍ EMPIEZA EL FORMULARIO (alta "Usuario nuevo") ============ */}
      {tab === 0 && (
        <Card sx={{ maxWidth: 920, mx: 'auto', borderRadius: 3, border: '1px solid rgba(22,49,114,0.12)' }}>
          <CardContent sx={{ p: 3 }}>
            {/* Encabezado del registro: avatar con iniciales + título */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48, height: 48, borderRadius: '50%',
                  display: 'grid', placeItems: 'center',
                  bgcolor: 'primary.main', color: 'primary.contrastText',
                  fontWeight: 800, fontSize: '1.1rem', flexShrink: 0,
                }}
              >
                {(form.nombre.trim().charAt(0) + form.paterno.trim().charAt(0)).toUpperCase() || 'NU'}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800} color="encabezado.main">
                  Registro de usuarios
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Captura los datos; el correo y la contraseña se generan solos.
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <SeccionFormulario titulo="Datos personales" columnas={3}>
                  <Box>
                    <Etiqueta htmlFor="nuevo-nombre" requerido>Nombre(s)</Etiqueta>
                    <TextField
                      id="nuevo-nombre" fullWidth variant="standard" value={form.nombre}
                      onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      placeholder="Ej. Juan"
                    />
                  </Box>
                  <Box>
                    <Etiqueta htmlFor="nuevo-paterno" requerido>Apellido paterno</Etiqueta>
                    <TextField
                      id="nuevo-paterno" fullWidth variant="standard" value={form.paterno}
                      onChange={(e) => setForm({ ...form, paterno: e.target.value })}
                      placeholder="Ej. Pérez"
                    />
                  </Box>
                  <Box>
                    <Etiqueta htmlFor="nuevo-materno">Apellido materno</Etiqueta>
                    <TextField
                      id="nuevo-materno" fullWidth variant="standard" value={form.materno}
                      onChange={(e) => setForm({ ...form, materno: e.target.value })}
                      placeholder="Ej. López"
                    />
                  </Box>
                </SeccionFormulario>

                {/* VISTA PREVIA: el correo y la pass se generan solos, no se piden. */}
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Se creará con correo <strong>{emailPreview || '…'}</strong>
                  {rolFinal && <> como <strong>{rolFinal.nombre}</strong></>} y
                  contraseña genérica del sistema (se muestra al crear).
                </Alert>

                <SeccionFormulario titulo="Rol y asignación" columnas={2}>
                  <Box>
                    <Etiqueta htmlFor="nuevo-rol" requerido>Rol</Etiqueta>
                    <FormControl fullWidth required variant="standard">
                      <Select native id="nuevo-rol" value={form.id_rol} onChange={handleRolBase}>
                        <option value="">Selecciona rol</option>
                        {rolesBase.map((r) => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  {admin && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={esSuper}
                            onChange={handleEsSuper}
                            disabled={!superDisponible}
                            color="primary"
                          />
                        }
                        label={<Typography variant="body2">¿Es superusuario?</Typography>}
                      />
                    </Box>
                  )}
                  <Box>
                    <Etiqueta htmlFor="nuevo-area" requerido>Área</Etiqueta>
                    <FormControl fullWidth required variant="standard" disabled={areas.length === 1 || esSuper}>
                      <Select native id="nuevo-area" value={form.id_area} onChange={(e) => setForm({ ...form, id_area: e.target.value })}>
                        <option value="">Selecciona área</option>
                        {areas.map((a) => (
                          <option key={a.id} value={a.id}>{a.nombre}</option>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <Etiqueta htmlFor="nuevo-puesto">Puesto</Etiqueta>
                    <FormControl fullWidth variant="standard">
                      <Select
                        native id="nuevo-puesto" value={form.puesto}
                        onChange={(e) => setForm({ ...form, puesto: e.target.value })}
                      >
                        <option value="">Selecciona puesto</option>
                        {puestos.map((p) => (
                          <option key={p.id} value={p.nombre}>{p.nombre}</option>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                  <Box>
                    <Etiqueta htmlFor="nuevo-telefono">Teléfono</Etiqueta>
                    <TextField id="nuevo-telefono" fullWidth variant="standard" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} type="tel" placeholder="Ej. 55 1234 5678" />
                  </Box>
                  <Box>
                    <Etiqueta htmlFor="nuevo-ingreso">Fecha de ingreso</Etiqueta>
                    <TextField id="nuevo-ingreso" fullWidth variant="standard" type="date" value={form.fecha_ingreso} onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })} InputLabelProps={{ shrink: true }} />
                  </Box>
                </SeccionFormulario>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button type="submit" variant="contained" color="primary" size="large" sx={{ px: 4, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                    Crear usuario
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => { setForm({ ...FORM_VACIO, id_area: areas.length === 1 ? String(areas[0].id) : '' }); setEsSuper(false); }}
                    sx={{ borderRadius: 2, textTransform: 'none', borderColor: 'encabezado.main', color: 'encabezado.main' }}
                  >
                    Limpiar
                  </Button>
                </Box>
              </Stack>
            </form>
          </CardContent>
        </Card>
      )}
      {/* ============ AQUÍ TERMINA EL FORMULARIO (alta "Usuario nuevo") ============ */}

      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Ver usuarios</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Correo</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Área</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cargando ? (
                  <TableRow><TableCell colSpan={7} align="center">Cargando...</TableCell></TableRow>
                ) : usuarios.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center">Sin usuarios</TableCell></TableRow>
                ) : (
                  usuarios.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>{u.nombre}</TableCell>
                      <TableCell>{u.correo}</TableCell>
                      <TableCell>{u.rol}</TableCell>
                      <TableCell>{u.area}</TableCell>
                      <TableCell>
                        <Chip label={u.activo ? "Activo" : "Baja"} color={u.activo ? "success" : "default"} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver y quitar permisos">
                          <IconButton size="small" onClick={() => verDetalle(u.id)} sx={{ color: 'encabezado.main' }}>
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                        {u.activo ? (
                          <Tooltip title="Dar de baja (activo=0, no se borra)">
                            <IconButton size="small" onClick={() => setConfirmarBaja(u.id)} color="error">
                              <DeleteOutlinedIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Reactivar acceso">
                            <IconButton size="small" onClick={() => handleReactivar(u.id)} color="success">
                              <AddIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* DETALLE: datos + matriz + cambio de rol (quita/da permisos) + baja/reactivar */}
      {detalle && (
        <Dialog open={!!detalle} onClose={() => setDetalle(null)} maxWidth="md" fullWidth>
          <DialogTitle>Usuario: {detalle.nombre}</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="body1"><strong>ID:</strong> {detalle.id}</Typography>
              <Typography variant="body1"><strong>Correo:</strong> {detalle.correo}</Typography>
              <Typography variant="body1"><strong>Área:</strong> {detalle.area} ({detalle.id_area})</Typography>
              <Typography variant="body1">
                <strong>Estado:</strong> {detalle.activo ? "Activo" : "Baja (inactivo, sigue en BD)"}
              </Typography>
              <FormControl fullWidth>
                <InputLabel shrink>Rol (cambiarlo quita/da permisos)</InputLabel>
                <Select
                  native value={nuevoRol} onChange={(e) => setNuevoRol(e.target.value)}
                >
                  {rolesOfrecidos.map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </Select>
              </FormControl>
              <Divider />
              <Typography variant="h6" fontWeight="bold">Permisos por categoría</Typography>
              <Typography variant="caption" color="text.secondary">
                Toca un permiso para darlo o quitarlo. Cambia el rol “{detalle.rol}”:
                afecta a TODOS los usuarios con ese rol.
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Categoría</TableCell>
                      <TableCell align="center">Ver</TableCell>
                      <TableCell align="center">Crear</TableCell>
                      <TableCell align="center">Modificar</TableCell>
                      <TableCell align="center">Eliminar</TableCell>
                      <TableCell align="center">Gestionar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detalle.permisos?.map((p) => (
                      <TableRow key={p.categoria}>
                        <TableCell>{p.categoria}</TableCell>
                        {ACCIONES_PERMISO.map(({ accion, clave }) => {
                          const encendido = Boolean(p[clave]);
                          const ocupado = permisoEnCurso === `${p.categoria}:${accion}`;
                          return (
                            <TableCell key={accion} align="center">
                              <Tooltip title={encendido ? `Quitar ${accion}` : `Dar ${accion}`}>
                                <span>
                                  <Chip
                                    label={ocupado ? "…" : encendido ? "Sí" : "No"}
                                    size="small"
                                    color={encendido ? "success" : "default"}
                                    clickable
                                    disabled={ocupado}
                                    onClick={() => togglePermiso(p.categoria, accion, clave, encendido)}
                                    sx={{ cursor: "pointer" }}
                                  />
                                </span>
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </DialogContent>
          <DialogActions>
            {detalle.activo ? (
              <Button onClick={() => { setDetalle(null); setConfirmarBaja(detalle.id); }} color="error">
                Dar de baja
              </Button>
            ) : (
              <Button onClick={() => handleReactivar(detalle.id)} color="success">
                Reactivar
              </Button>
            )}
            <Button onClick={guardarRol} variant="contained" color="primary" disabled={nuevoRol === String(detalle.id_rol)}>
              Guardar rol
            </Button>
            <Button onClick={() => setDetalle(null)} sx={{ color: 'encabezado.main' }}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Confirmar baja lógica */}
      {confirmarBaja && (
        <Dialog open onClose={() => setConfirmarBaja(null)} maxWidth="sm">
          <DialogTitle>¿Dar de baja a este usuario?</DialogTitle>
          <DialogContent>Se pondrá activo=0 (no se borra de la BD) y ya no podrá acceder.</DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmarBaja(null)} color="inherit">Cancelar</Button>
            <Button
              onClick={async () => {
                try {
                  await bajaUsuario(confirmarBaja);
                  setExito("Usuario dado de baja (activo=0, sigue en BD)");
                  setConfirmarBaja(null);
                  recargar();
                } catch (e) {
                  setError(e.message);
                }
              }}
              color="error" variant="contained"
            >
              Confirmar baja
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

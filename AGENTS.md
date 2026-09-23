# SisLegal — Guía para agentes

Sistema de gestión documental legal ("Sistema de Residencias").
Lee este archivo antes de tocar código. La sesión original está en
`C:\Users\vave_\Documentos\Sesiones\ProyectoLegal.md`.

## Proyecto

- Ruta: `C:\Users\vave_\Escritorio\proyecto_r\proyecto_resi`
- Front: React 19 + Vite + MUI v9 + React Router 7 (`src/`)
- Back: Express + MariaDB (`server/`), BD `sislegal` en `localhost:3306`
- **Repo git local.** Hay `.git` con commit inicial estable. Antes de cambios
  grandes revisa `git status`; si algo se rompe, `git diff` / `git checkout -- <archivo>`
  para revertir. Verifica siempre con `npm run build` y `npx eslint .`

## Stack oficial y UI

- Stack del documento del proyecto (referencia): Python, FastAPI, React.js,
  Azure OpenAI Service, Azure AI Document Intelligence, PostgreSQL, Docker,
  GitHub Actions, LangChain, Microsoft Entra ID y Scrum.
- Implementación actual: el backend en uso es **Express + MariaDB**
  y la BD es MariaDB. **FastAPI NO está eliminado: aún no se incorpora**
  (está pendiente integrarlo según el stack oficial).
- La interfaz se está haciendo con **Material UI (MUI v9)**: todos los
  formularios, tablas, diálogos, tabs y navegación usan componentes MUI
  (`TextField`, `Select`/`NativeSelect`, `Checkbox`, `Switch`, `Button`,
  `Table`, `Dialog`, `Tabs`, `Card`, `Alert`, etc.) con el tema de `src/theme.js`.
  No introducir otras librerías de UI.
- Scripts: `npm run todo` (API :8000 + web :5173 con concurrently),
  `npm run api` (solo API), `npm run dev` (solo web), `npm run build`, `npx eslint .`
- Si hay `EADDRINUSE`: `Get-NetTCPConnection -LocalPort 8000,5173 | % { taskkill /PID $_.OwningProcess /T /F }`
- `server/.env` usa `root/1234` (temporal; rotar a usuario `sislegal`). JWT 8h.
- Usuarios de prueba: `admin@sislegal.mx/Admin123*` (admin total).
- Salud: `GET http://localhost:8000/api/salud` → 11 tipos, 137 campos, 20 permisos.
- Verificación BD sin servidor: `cd server; npm run db:test`

## Datos

- `db/sislegal_schema.sql` es la **fuente de verdad** (14 tablas, 11 tipos, 137 campos).
- `src/lib/tiposDocumentos.js` es espejo del catálogo (`filas`, `ayuda`, `mostrarSi`;
  `mostrarSi.valor === true` es booleano, viene de `cond_valor='true'`).
- Tipos de campo: `texto | area | fecha | email | seleccion | moneda | fotos | check | switch | anexos`.
- **Los permisos viven en el ROL** (`permisos_rol`), no por usuario.
  La matriz del diálogo de usuario muestra el rol actual; editarla cambia el rol
  (afecta a TODOS los usuarios con ese rol). Endpoints:
  `PATCH /api/usuarios/roles/:id/permisos { categoria, accion, valor }`.
- Admin gestiona todo (incl. rol Administrador sin área; en ese caso el área es obligatoria).
  Supers solo ven/gestionan su área, solo roles normales (NO crean ni asignan supers).
- El login (`POST /api/auth/login`) **NO devuelve flag `admin`** en `usuario`.
  Para saber si es admin usa `usePermisos()` (`GET /api/usuarios/yo/permisos`).
  No leas `admin` de `localStorage`.
- `documentos` está vacía (0 filas): las tablas de Inicio salen vacías hasta que
  haya documentos. `GenerarCarta` aún **no persiste** (Confirmar solo cierra el resumen).

## Reglas de UI (dadas por el usuario, obligatorias)

1. **Etiquetas fijas arriba** (`src/Components/Etiqueta.jsx`, 0.79rem, `position:static`).
   Nunca etiquetas flotantes que se encimen.
2. **Fechas `dd/mm/aaaa`**: `TextField type="text"` + máscara auto + icono calendario
   que abre picker nativo oculto (`showPicker`, convierte ISO→dd/mm/aaaa).
   Validar con `esFechaValida`. En MUI v9 pasar el adorno por `InputProps` Y `slotProps.input`.
   Solo `id==='fecha'` lleva hoy auto. No auto: `fechaInicio, fechaFin, vigencia,
   ultimoDia, fechaRescision, fechaApertura`.
3. **`area` respeta `campo.filas ?? 3`.**
4. **Anexos solo PDF**: botón "Anexos (solo PDF)", `accept=application/pdf,.pdf`,
   acumula `File[]`, lista clicable + tache (CloseIcon), preview en Dialog modal
   bloqueante (ignora `backdropClick`/`escapeKeyDown`, solo Cerrar/X, iframe 70vh),
   error "Solo se permiten archivos PDF". Fotos: JPG/PNG.
5. **Destinatario opcional** (checkbox + Tooltip `¡`, por defecto "A quien corresponda")
   SOLO en `carta-poder` y `carta-intencion`. Los otros 9 tipos tienen destinatario fijo.
   Constante: `TIPOS_SIN_DESTINATARIO_OPCIONAL` en `GenerarCarta.jsx`.
6. **Validación manual** en `handleSubmit` con `errores` (required, fecha, email,
   moneda, fotos, anexos, check/switch); si hay errores no se abre el Dialog.
   Limpieza auto de dependientes: `estadoFisico, motivo, ccp, viaticos, transferencia`.
7. **Box por tipo** (ver `GenerarCarta.jsx`): cada tipo tiene sus secciones y columnas
   definidas (oficio-petición 4, comisión 5, resolución 6, privacidad 4, rescisión 4,
   funcionamiento 3, notificación 5, cartas 3-5). Orden oficio-petición: folio, asunto,
   peticion, ccp, ccpDetalle, anexos, fundamentarArt8 debajo de anexos.
8. **Resumen** (`ResumenDocumento.jsx`): fecha ISO→dd/mm/aaaa, moneda `$`, check Sí/No,
   switch Sí/No (Art.8: "Con fundamento en el artículo 8 Constitucional"),
   anexos "Se adjunta(n) N documento(s) como anexo: …", destinatario primero.
9. **Escala compacta** (`theme.js`): `html 87.5%`, tipografías reducidas
   (h4 1.75, h5 1.25, h6 1.05, body1 0.9, body2 0.875, caption 0.75, button 0.85).
   Drawer 210px.
10. **Color: 4 acentos** (azul #163172, rojo, verde, blanco) + token `encabezado`
    (legible sobre papel en claro/oscuro/blanco).
    - Sobre papel (textos, iconos, títulos, links, tabs, botones text/outlined):
      **siempre `encabezado.main`**. Nunca `white` fijo ni `primary.main` como texto.
    - Sobre acento (AppBar, Drawer, headers de tabla, contained): fondo `primary.main`
      + texto/iconos `primary.contrastText`.
    - Tabs MUI: seleccionado e indicador con `encabezado.main` (sx override).
11. **Formulario Usuarios** (`UsuariosAdmin.jsx`, entre comentarios
    `AQUÍ EMPIEZA/TERMINA EL FORMULARIO`): Card 920 + avatar de iniciales vivas +
    `SeccionFormulario` + `Etiqueta` + campos `standard`. Rol = selector base
    (Legal/Operativo/Administrador) + switch `¿Es superusuario?` (solo admin) que
    mapea al super de la misma área y fija el área. Limpiar resetea `esSuper`.
12. Componentes reutilizables en `src/Components/` con encabezado de flujo
    (de dónde vienen / a dónde van los datos) + ids `Box-*`. Páginas protegidas con
    `RutaProtegida` + `VigilanteSesion` (eventos `sislegal:sin-conexion` /
    `sesion-expirada` → `/Ingreso`). Heartbeat 30s en layout + `EstadoConexion`.

## Pendientes conocidos

- Seeds de documentos de prueba (tabla `documentos` vacía).
- Conectar Generar → API (`crearDocumento` + `agregarAdjunto`) para que persista.
- Portadas EADDRINUSE: matar árboles con `taskkill /PID /T /F`.

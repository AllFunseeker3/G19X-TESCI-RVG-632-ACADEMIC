# SisLegal — Guía para agentes

Sistema de gestión documental legal ("Sistema de Residencias").
Lee este archivo antes de tocar código. La sesión original está en
`C:\Users\vave_\Documentos\Sesiones\ProyectoLegal.md`.

## 🛑 REGLAS PERMANENTES DEL USUARIO (2026-10-17) — LEER ANTES QUE NADA

Orden explícita del usuario tras el incidente §25 (otro modelo revirtió el front el
2026-09-22). Aplican SIEMPRE, a todo agente/modelo que toque este repo:

1. **PROHIBIDO cambiar el diseño establecido.** No tocar `theme.js`, layout, Drawer,
   AppBar, colores, tipografías, escala, espaciados ni estilos de componentes ya
   establecidos. Nada de "mejoras" estéticas/visuales sin autorización explícita.
2. **PROHIBIDO quitar funcionalidades, endpoints, componentes, archivos o código que
   sirve** sin autorización explícita del usuario. Nada de "limpieza", refactors o
   reescrituras por iniciativa propia. Detectar código muerto o un bug ≠ borrarlo:
   **informar y preguntar primero**; el usuario decide.
3. **No reinventar la rueda.** Lo que ya está hecho y funciona se respeta y se
   reutiliza; no proponer rehacerlo ni sustituirlo sin que el usuario lo pida.
4. **Cambios quirúrgicos**: solo lo estrictamente necesario para la tarea pedida,
   siguiendo los patrones ya existentes en el archivo (mismo estilo, mismos componentes).
5. **Ante la duda, preguntar.** No asumir. No "aprovechar" para tocar cosas fuera de lo pedido.
6. **Verificación obligatoria** tras cualquier cambio: `git status` antes (árbol limpio),
   `npx eslint .` + `npm run build` + probar lo tocado después; `git checkout` para revertir si algo se rompe.

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
- **IA: OpenRouter (decisión del usuario, sin Azure por costo).**
  El servicio de redacción usa OpenRouter (`https://openrouter.ai/api/v1`,
  compatible con SDK OpenAI) en vez de Azure OpenAI Service.
  Clave en variable de entorno del backend (`OPENROUTER_API_KEY`, nunca en código
  ni en git) + `IA_MODEL` con el ID exacto del modelo elegido en
  openrouter.ai/models (de preferencia uno marcado `:free`).
  Headers recomendados: `HTTP-Referer` (URL de la app) y `X-Title: SisLegal`.
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
- `server/.env` usa usuario `sislegal`; contraseña SOLO ahí (no versionada; rotada el 30/09/2026, 18/10/2026 y 21/10/2026; ya no root). La contraseña de **root local** se rotó el 21/10/2026 en sus 5 cuentas (`localhost`, `127.0.0.1`, `::1`, `ricardo_victus`, `%`) y la del **volumen Docker** (`root@%` y `root@localhost`) también el 21/10/2026 sin borrar el volumen; el valor vive solo en `.env` (ignorado). JWT 8h, rotado también el 21/10/2026.
- Usuarios de prueba: `admin@sislegal.mx/Admin123*` (admin total).
- Salud: `GET http://localhost:8000/api/salud` → 11 tipos, 137 campos, 20 permisos, 6 usuarios.
- Verificación BD sin servidor: `cd server; npm run db:test`
- Pruebas automáticas de API: `cd server; npm test` (node:test + supertest; 6 casos; limpia sus datos y restaura folios)
- Seguridad (21/10/2026): `server/.dockerignore` y `ai-service/.dockerignore` evitan secretos en imágenes; Docker publica API/web solo en `127.0.0.1` y la IA solo es interna (`ia:8001`). `GET /api/clientes` exige admin o `cartas.ver`; las descargas de PDF validan `docVisible` o que el archivo lo haya generado el mismo usuario hace ≤10 min; `POST /api/documentos/:id/adjuntos` es solo admin.

## Datos

- `db/maestro.sql` es la **fuente de verdad** (14 tablas + `adjuntos.vigente` ADJ-01, 11 tipos, 137 campos).
  Migraciones aplicadas en vivo: `migracion_ia_contenido`, `migracion_notificaciones`,
  `migracion_clientes_verificado` (CLI-01), `migracion_adjuntos_vigente` (ADJ-01),
  `migracion_cambio_contrasena` (CC-01, 18/10).
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
- Altas de usuarios (CC-01, 18/10): contraseña temporal = parte del correo + 8 aleatorios
  (se muestra una sola vez al crear). `debe_cambiar_contrasena` bloquea TODA la API
  (403 `CAMBIO_CONTRASENA_REQUERIDO`) hasta cambiarla con
  `POST /api/auth/cambiar-contrasena { actual, nueva }`; es la única ruta que pasa
  con el flag activo (`conAuthPermitirCambio` en middleware). Seeds/demo quedan en FALSE.
- `documentos` ya tiene datos reales; `GenerarCarta` persiste (Confirmar crea + PDF) y
  el modo `?editar=` corrige vía `PATCH /:id/datos` (vuelve a borrador + re-avisa).
- Estados UI: `borrador` se muestra como "En revisión" (`estados.js`, chip info).
- Folios automáticos (FOL-01): `POST /documentos` genera `PREFIJO-AAAA-NNN` si no viene
  folio (`siguienteFolio()` atómico con tabla `folios`; prefijos CP/CR/REN/CI/PET/COM/RES/PRI/RLA/FUN/NOT).
- PDFs versionados (ADJ-01): `adjuntos.vigente`; regenerar marca anteriores como
  histórico; `DELETE /documentos/:id` borra también los .pdf del disco.
- Clientes con `verificado` + autorrelleno en GenerarCarta; campanita con fan-out
  crear/corregir (supers+admins) y dictamen (creador + motivo); carta-poder sin
  destinatario + cliente inyecta el nombre (`enriquecerDestinatario`).

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

- Recrear usuarios extra (Ricardo/Javier/Lucía) — se perdieron en el DROP + maestro del 29/09.
- `clientes.contacto` eliminado (LIM-01 2026-10-14; quitado del form §60, DROP físico aplicado).
- Subida real de fotos/anexos al servidor (viven en memoria del form; solo el PDF final persiste).
- Portadas EADDRINUSE: matar árboles con `taskkill /PID /T /F`.

## IA (redacción automática, en construcción)

- Servicio `ai-service/` (FastAPI + LangChain + OpenRouter, puerto 8001).
  Arranque: `python -m uvicorn main:app --host 127.0.0.1 --port 8001` desde `ai-service/`
  (requiere `pip install -r requirements.txt`). Credenciales en `ai-service/.env`
  (ignorado por git; plantilla en `.env.example`). `GET /salud`, `POST /redactar`.
- Plantilla piloto: solo `carta-poder` (`PLANTILLAS` en `main.py`).
  Otros tipos → 400. Modelo saturado → 429 limpio para reintentar.
- Proxy Express con auth: `POST /api/ia/redactar` (`server/routes/ia.js`,
  `IA_URL` default `http://127.0.0.1:8001`). El front nunca llama directo a la IA.
  En Docker la IA no publica puerto de host: `api → http://ia:8001`.
- BD: migración `db/migracion_ia_contenido.sql` (`contenido MEDIUMTEXT`,
  `modelo_ia VARCHAR(120)`); aplicador `server/aplicar-migracion-ia.js`.
  `POST /api/documentos` acepta `contenido` + `modelo_ia` (borrador).
- Front: `redactarConIA()`, `generarPDF()`, `descargarPDF()` en `lib/api.js`;
  botón "Redactar con IA" en `GenerarCarta.jsx` (solo carta-poder): valida,
  redacta, preview en Dialog, "Guardar documento" persiste como borrador,
  genera el PDF y muestra "Descargar PDF" (Blob autenticado).
- PDFs: `ai-service/pdf_carta_poder.py` (reportlab, formato institucional:
  lugar/fecha derecha, título centrado subrayado, cuerpo justificado con datos,
  firmas Otorgante/Apoderado + Testigos). `POST /pdf` en ai-service;
  `POST /api/ia/pdf` (registra adjunto solo-PDF si hay `id_documento`; exige
  `docVisible(..., \"modificar\")`); `POST /api/documentos/:id/adjuntos` es solo
  admin (evita reclamar el PDF de otro documento); `GET /api/ia/pdf/:archivo`
  exige adjunto visible o PDF reciente del mismo usuario (10 min), no solo login.
  Carpeta `documentos/Sistema legal/` (ignorada en git, se regenera).
- Tras cambiar `server/`, reiniciar la API (`npm run todo` de nuevo):
  Node no recarga solo.

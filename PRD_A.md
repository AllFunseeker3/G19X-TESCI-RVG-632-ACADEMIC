# PRD_A — Sistema Automatizado para la Elaboración de Cartas y Notificaciones Legales (Versión genérica, sin empresa)

**Versión:** 2.0 — 30/09/2026
**Estado:** Real / verificado contra código, BD y servicios en vivo
**Base:** `Requerimientos.pdf` puntos 3 al 7 + `Tipos de documentos legales.txt` + código real en `proyecto_resi`
**Nota:** este PRD describe lo que el sistema HACE hoy. No describe deseos. Lo que NO hace se marca explícito en §6.

---

## 1. Contexto (sin empresa)

Proyecto de residencia / estadía LegalTech de carácter genérico.

No se adscribe a ningún despacho ni dependencia usuaria en este documento. El sistema `SisLegal` está pensado para un área jurídica genérica que necesita generar, revisar y trazar documentos legales.

> `[PENDIENTE USUARIO: si tu escuela te pide nombrar dependencia usuaria final, escribe aquí nombre del despacho / juzgado / empresa destinataria. Si no, deja "usuario jurídico genérico".]`

> `[PENDIENTE USUARIO: nombre del residente/autor, matrícula, carrera, periodo de estadías, nombre del asesor académico.]`

Roles académicos y roles del software van separados (ver §7). Ningún asesor académico dictamina documentos en el sistema.

---

## 2. Tecnologías REALES usadas (sustituye al punto 2 del PDF)

El punto 2 del PDF (`Python, FastAPI, React.js, Azure OpenAI Service, Azure AI Document Intelligence, PostgreSQL, Docker, GitHub Actions, LangChain, Microsoft Entra ID y Scrum`) **NO se usa tal cual**. Esto es lo que sí corre hoy:

**Front (`:5173`):**
- React 19 + Vite 8 + React Router 7
- MUI v9 + Emotion + Tailwind 3 (toda la UI es MUI, tema en `src/theme.js`, escala compacta `html 87.5%`, drawer 210px, 4 acentos azul #163172 / rojo / verde / blanco + token `encabezado`)
- `src/Pages` (10): app, Ingreso, Inicio, GenerarCarta, Revision, Seguimiento, Clientes, Usuarios, plantillas, Configuracion
- `src/Components` (16): DashboardLayout, CampoFormulario, SeccionFormulario, ResumenDocumento, ProgresoIA, CentroNotificaciones, PermisosProvider, UsuariosAdmin, etc.
- `src/lib/api.js`: fetch con Bearer JWT, eventos `sislegal:sin-conexion` / `sesion-expirada`

**Back (`:8000`):**
- Express 4 + `mysql2` + MariaDB `sislegal` en `localhost:3306` + `jsonwebtoken` (JWT 8h) + `bcryptjs` + `cors` + `dotenv`
- Rutas `server/routes/` (8): auth, catalogo, clientes, documentos, ia (proxy), notificaciones, usuarios, salud
- `npm run todo` levanta API + web con concurrently. `npm run api` solo API.

**IA (`:8001`):**
- FastAPI + Uvicorn + LangChain (+ `langchain-openai`, `langchain-google-genai`) + `reportlab`
- Proveedor real: **OpenRouter** (`https://openrouter.ai/api/v1`), modelo default `qwen/qwen3.8-27b:free` con fallback multi-modelo por lista en coma (`gemma-4-26b, gemma-4-31b, nemotron-3-ultra`). Key Google guardada solo como alternativa (probada con 503/404, hoy no usada).
- Endpoints: `GET /salud`, `POST /redactar`, `POST /corregir`, `POST /pdf`
- PDFs en `documentos/Sistema legal/` (ignorada en git), formato institucional carta-poder + genérico 10 tipos
- Credenciales en `ai-service/.env` (ignorado por git). Flag `IA_PRE_FORMALIZAR=1`.

**BD:**
- MariaDB, `db/maestro.sql` = fuente de verdad (14 tablas, ver §9). Migraciones: `migracion_ia_contenido`, `migracion_notificaciones`, `migracion_clientes_verificado`, `migracion_limpieza_01`.

**Tabla gap oficial vs real:**

| PDF punto 2 | Estado real |
|---|---|
| Python, FastAPI, React, LangChain | SÍ se usan (FastAPI solo en ai-service) |
| Azure OpenAI Service | NO. Sustituido por OpenRouter/Google free por costo |
| Azure AI Document Intelligence | NO. No hay OCR. Solo reportlab genera PDF |
| PostgreSQL | NO. Es MariaDB/MySQL |
| Docker | SÍ (14/10/2026). `docker-compose.yml` (db MariaDB 11 + ia + api + web nginx `:8080`), Dockerfiles por servicio, `.env.docker.example` sin secretos, verificado 4 Up |
| GitHub Actions | NO. Sin CI. Verificación manual `npm run build` + `npx eslint .` |
| Microsoft Entra ID | NO. Auth propia JWT en localStorage, sin SSO |
| Scrum | Solo documental, sin ceremonias formales |

---

## 3. Delimitación del proyecto (punto 3 del PDF, textual + matiz real)

> "El sistema automatizará la generación de cartas, oficios, avisos y notificaciones legales mediante plantillas parametrizadas, reglas jurídicas y datos estructurados. Incorporará inteligencia artificial para redactar contenido, validar consistencia documental, gestionar flujos de aprobación y mantener trazabilidad y control de versiones."

**Matiz real 30/09/2026:**
- Sí automatiza generación de 4 categorías + 11 tipos + 137 campos (`src/lib/tiposDocumentos.js` espejo de BD).
- Sí incorpora IA para redactar + formalizar + corregir (`/redactar`, `/corregir`).
- Sí gestiona aprobación (borrador→aprobado/rechazado) y trazabilidad (`documento_historial` + timeline en Seguimiento).
- Control de versiones = historial por dictamen + regeneración de PDF, NO versionado semántico de plantillas.
- Validación = formal (required, email, fecha dd/mm/aaaa, moneda, PDF-only) + formalización IA, NO validación jurídica automática contra códigos.

---

## 4. Objetivos (punto 4 del PDF)

**Objetivo General:**
Desarrollar un sistema inteligente para la elaboración automatizada de cartas y notificaciones legales.

**Objetivos Específicos (estado real):**
1. Analizar los procesos documentales — HECHO (catálogo 11 tipos fijado).
2. Diseñar la arquitectura tecnológica — HECHO (Express+MariaDB+React+FastAPI-IA, documentada en §8).
3. Implementar automatización y validación jurídica — HECHO parcial (automatización + validación formal + formalización IA; validación jurídica de fondo sigue siendo humana).
4. Validar la calidad de los documentos — HECHO parcial (QA manual + build/lint + pruebas en vivo; sin suite automatizada).
5. Elaborar documentación técnica y plan de soporte — PARCIAL (este PRD + `AGENTS.md` + comentarios en código; falta manual de usuario final y plan multinivel formal).

> `[PENDIENTE USUARIO: redacta 1 párrafo por objetivo con evidencia de tu residencia: fechas, actas, capturas.]`

---

## 5. Justificación (punto 5 del PDF)

- **Industria:** reduce tiempos y errores por copiado manual, evita destinatarios "A quien corresponda" cuando hay cliente vinculado, estandariza machotes (ej. carta poder con OTORGO/ACEPTO/TESTIGOS en mismo bloque).
- **Valor LegalTech:** portafolio de automatización documental con IA de bajo costo (modelos free, sin Azure).
- **Alumno:** competencias en IA generativa (prompts + fallback), automatización documental (137 campos condicionales), arquitectura empresarial (3 servicios + 14 tablas + RBAC).

> `[PENDIENTE USUARIO: agrega 3-5 líneas de justificación personal: por qué elegiste este caso, qué problema viste en el área jurídica.]`

---

## 6. Alcance — HACE / NO HACE / NO HARÁ

### 6.1 HACE (verificado en código y en vivo)

**Generar (`GenerarCarta.jsx` + `tiposDocumentos.js`):**
- Selector Categoría → Tipo dependiente (4 + 11). Al cambiar categoría resetea tipo+datos.
- Formulario dinámico por Box y columnas por tipo (poder 5 Box/17 campos, responsiva 19, renuncia 9, intención 14, petición 14, comisión 14, resolución 13, privacidad 9, rescisión 10, funcionamiento 9, notificación-general 9).
- Tipos de campo: texto, area (respeta `filas`), fecha dd/mm/aaaa con máscara + picker nativo oculto, email, seleccion, moneda `$`, fotos JPG/PNG, check, switch, anexos solo-PDF con preview modal bloqueante.
- Destinatario opcional (checkbox + Tooltip) SOLO en carta-poder e intención. Otros 9 con destinatario fijo.
- Autocomplete Clientes con chip Sin verificar + mapa de autorrelleno por tipo (solo rellena vacíos; comisión solo vincula `id_cliente`).
- Validación manual bloqueante con `errores`. Solo `id==='fecha'` trae hoy auto.
- Flujo: `Generar documento con IA` → valida → **Resumen** (`ResumenDocumento.jsx`, verificar datos) → botón Redactar con IA → Dialog IA solo-lectura + `ProgresoIA.jsx` (fases + cronómetro, sin spinner) + cuadro retro "¿Algo está mal?" + Corregir con IA repetible → Confirmar y guardar crea doc + PDF.
- Modo `?editar=` precarga + banner con motivo, `PATCH /:id/datos` (solo creador/admin en borrador/rechazado, vuelve a borrador + re-avisa).

**IA (`ai-service/main.py` 425 líneas):**
- `TIPOS_IA` 11 + `ESTRUCTURAS_IA` + `PROMPT_CARTA_PODER` machote exacto + `PROMPT_GENERICO`.
- Pre-formaliza facultades/límites (`lana→recursos`, `Ninguno→Sin limitación alguna.`) si `IA_PRE_FORMALIZAR=1`. Párrafo `Asimismo...` contextual generado, nunca fijo.
- `POST /redactar {id_tipo, datos}`, `POST /corregir {contenido, instruccion}`, `POST /pdf {id_tipo, datos, contenido}`. Fallback multi-modelo ante 429/503.

**PDF (`pdf_carta_poder.py` 258 líneas, reportlab, letter, Times):**
- Poder: lugar/fecha derecha, título centrado subrayado, destinatario+PRESENTE, facultades formalizadas, límites, vigencia, Asimismo contextual, Atentamente, OTORGO/ACEPTO+TESTIGOS en un solo `KeepTogether` con `splitByRow=0`.
- Genérico 10 tipos: título + lugar/fecha + cuerpo IA + firma única en `KeepTogether`.
- Guarda en `documentos/Sistema legal/` + registra adjunto solo-PDF si hay `id_documento`. Descarga con login `GET /api/ia/pdf/:archivo` → Blob → iframe 70vh (Revisión) o download (Generar).

**Revisión (`Revision.jsx`):**
- Bandeja real `GET /api/documentos`, columna Creado por (`LEFT JOIN usuarios`), tab En revisión (=borrador), filtros, Borrar con Dialog MUI propio (sin `window.confirm`), dictamen admin/super/modificar (rechazo exige comentario), visor PDF supervisores, `DELETE /:id` CASCADE.
- Botón **Revisar documento** (REV-01, sin "IA" en etiqueta): sube PDF externo ≤10MB (`POST /api/ia/revisar` → `/revisar-pdf`), la IA clasifica 1 de 11 + extrae datos + veredicto APROBABLE/CORREGIBLE/RECHAZABLE; Editar guarda en `sessionStorage` y abre `/Menu?origen=revision-pdf` para generar carta **nueva**.

**Plantillas (oculta 14/10):**
- Galería `plantillas.jsx` sin sentido como página (duplica al selector de GenerarCarta): oculta del drawer, ruta `/Plantillas` viva. Flujo oficial `/Menu` directo.

**Seguimiento (`Seguimiento.jsx`):**
- Timeline vertical real (historial + adjuntos + responsable), alerta motivo rechazo + botón Editar y corregir (`/Menu?editar=`).

**Inicio (`Inicio.jsx`):**
- KPIs reales (sin 150/75/75/200 fijos), buscador integrado en tabla (máx 8 + contador), dona `md=5` + actividad `md=7` misma altura con scroll, accesos misma altura. Sin módulo Vencimientos (sin fuente).

**Clientes (`Clientes.jsx` + `/api/clientes`):**
- Tabla con chips Verificado/Pendiente, tabs Todos/Pendientes, Verificar, diálogo Persona/CURP vs Empresa/RFC, baja lógica. Alta por no-admin/super nace pendiente; edición ajena sobre verificada la regresa a pendiente.

**Usuarios (`Usuarios.jsx` + `UsuariosAdmin.jsx` + `/api/usuarios`):**
- Alta Nombre/paterno/materno, email auto ASCII, pass genérica `SisLegal2026*`, selector base Legal/Operativo/Administrador + switch super (solo admin). Matriz permisos clicable edita el ROL (`PATCH /roles/:id/permisos`). Baja lógica + reactivar. 5 usuarios base con hashes reales en `maestro.sql`.

**Notificaciones (`CentroNotificaciones.jsx` + `/api/notificaciones`):**
- Tabla `notificaciones`, badge no-leídas, últimas 10 con hace-cuánto, marca leída al abrir/clic, refresco 30s. Fan-out al crear/corregir (supers área + admins) y al dictaminar (solo creador + motivo si rechazo).

**Auth y permisos:**
- `POST /api/auth/login` bcrypt + JWT 8h, `localStorage sislegal-token/usuario`, `VigilanteSesion` + `RutaProtegida`, heartbeat 30s + `EstadoConexion`. RBAC por `roles+permisos_rol+areas+puestos` vía `PermisosProvider.puede()`.

**Configuración:**
- `ThemeModeProvider` + 4 acentos + modo oscuro, persistencia localStorage.

**Folios automáticos FOL-01 (30/09):**
- `POST /documentos` genera `PREFIJO-AAAA-NNN` si no viene folio (`siguienteFolio()` atómico con tabla `folios` + `FOR UPDATE`; prefijos CP/CR/REN/CI/PET/COM/RES/PRI/RLA/FUN/NOT); manual se respeta si viene; respuesta incluye el folio y el front lo muestra en la alerta.

**PDFs versionados ADJ-01 (30/09):**
- `adjuntos.vigente`; regenerar marca anteriores como histórico (transacción); visor con badge Actual/Versión anterior; `DELETE` borra también los .pdf del disco.

**Conexión BD con usuario `sislegal` (rotado 30/09, ya no root).**

**Docker (14/10) + limpieza LIM-01 (14/10):**
- Compose db+ia+api+web (`:8080`), Dockerfiles, `.env.docker.example` sin secretos, CORS por env, healthcheck `mariadb-admin`. Verificado 4 Up.
- 15→14 tablas (DROP `auditoria` + `clientes.contacto`), borrado `db/sislegal_schema.sql` (duplicado), migraciones no fusionadas.

### 6.2 NO HACE (hoy no existe)

- Firma electrónica avanzada / e.firma SAT. Solo firmas en texto del PDF.
- OCR / extracción de PDFs históricos. No hay Document Intelligence.
- SSO Entra ID, refresh-token, bloqueo por intentos, 2FA.
- Versionado semántico de plantillas (solo historial de documentos).
- Subida real de fotos/anexos al servidor (viven en memoria del form; solo el PDF final se guarda).
- App móvil, PWA offline, push fuera de la campanita in-app.
- CI/CD, Docker, observabilidad centralizada, tests automatizados.
- Módulo Vencimientos en Inicio.

### 6.3 NO HARÁ (fuera de este ciclo de residencia, salvo que lo pidas)

- Integración Poder Judicial / buzón tributario.
- Facturación, cobros, multiempresa.
- Migración a PostgreSQL / Azure / Entra sin re-plan (implicaría reescribir `server/db.js`, auth y despliegue).
- IA con streaming en vivo, embeddings propios o fine-tuning.
- Soporte multinivel 24/7 formal.

> `[PENDIENTE USUARIO: tacha o mueve 1-2 ítems de NO HARÁ a "fase 2" si tu asesor te lo exige, y pon fecha.]`

---

## 7. Usuarios y roles reales (no académicos)

| Rol (BD `roles`) | Alcance | Puede |
|---|---|---|
| Administrador | Todo, sin área fija (al crear admin el área es obligatoria) | Todo + gestionar usuarios + verificar clientes + dictaminar |
| Super Legal / Super Operativo | Solo su área, solo roles normales | Verificar clientes, dictaminar su área, gestionar usuarios normales de su área. NO crean supers ni roles de otra área |
| Legal / Operativo | Solo su área | Crear/corregir sus docs, ver sus docs |
| Sistema | — | Cambia estado, genera acuse/historial |

Login real: `admin@sislegal.mx/Admin123*`, `legal/Legal123*`, `superlegal/SuperLegal123*`, `operativo/Operativo123*`, `superop/SuperOp123*`. Pass genérica altas: `SisLegal2026*`.
Estados canónicos BD: `borrador` (UI "En revisión"), `por_revisar`, `aprobado`, `rechazado`, `notificado`. `estados.js` mapea etiquetas + chip `info` para borrador.

---

## 8. Arquitectura real

```
[React SPA :5173] --Bearer JWT--> [Express :8000 /api/*] --mysql2--> [MariaDB :3306 sislegal]
        |                                   |
        +-- POST /api/ia/* (proxy auth) ----+--> [FastAPI IA :8001] --> OpenRouter free / Gemini
        |                                                      |
        +-- GET /api/ia/pdf/:archivo <--- [documentos/Sistema legal/*.pdf]
```

Puertos fijos: 5173 web local, 8000 API, 8001 IA (Docker: web `:8080`, resto igual). Reiniciar los 3 tras cambios en `server/routes` o `ai-service` (en Docker: `docker compose up --build api` / `ia` / `web`). EADDRINUSE local: matar árbol `taskkill /PID /T /F`.

---

## 9. Modelo de datos mínimo real (`db/maestro.sql`, 14 tablas)

- `areas, roles, puestos (sugerencias, sin FK), categorias, permisos_rol, usuarios(id_area, puesto, telefono, fecha_ingreso), clientes(tipo fisica/moral, curp/rfc, verificado BOOLEAN, activo, sin contacto), tipos_documento, campos_tipo(137 filas), documentos(datos JSON, contenido MEDIUMTEXT, modelo_ia, id_cliente, folio PREFIJO-AAAA-NNN), documento_historial, adjuntos(CHECK solo-PDF), notificaciones(tipo,titulo,detalle,id_documento,leida), folios`
- Seeds: 3 áreas, 5 roles, 4 categorías, 20 permisos, 11 tipos, 137 campos, 10 puestos, 5 usuarios con hashes reales, 1 cliente Acme verificado.
- Excepciones 3NF deliberadas: columnas JSON (forms dinámicos) + `usuarios.id_area` redundante.

---

## 10. RNF realistas

| ID | Requisito verificable |
|---|---|
| RNF-01 | Generación IA free 20-90s (paga 3-15s). PDF <5s local. Búsqueda tabla <500ms en vivo |
| RNF-02 | Disponibilidad local (sin SLA). Con Docker (compose verificado 14/10); sin CI |
| RNF-03 | JWT 8h + bcrypt 10 + RBAC por área. Conexión BD con usuario `sislegal` (rotado 30/09). Secretos fuera de git |
| RNF-04 | Solo PDF en adjuntos, validado en back y front. PII sin cifrado columna (pendiente) |
| RNF-05 | WCAG parcial: labels fijos `Etiqueta`, foco visible MUI, teclado completo salvo preview PDF |
| RNF-06 | Crear poder en <3 min sin IA, 3-5 min con IA free |
| RNF-07 | ESLint limpio, sin `console.log/debugger/TODO` en `src`, comentarios `AQUÍ EMPIEZA/TERMINA` |
| RNF-08 | Chrome/Edge 1280px y 390px sin traslapes. `npm run build` OK (warning chunk >500kB preexistente) |

---

## 11. Cronograma (base punto 6 del PDF + estado)

1. Detección necesidades → Doc requerimientos — HECHO (PDF + este PRD)
2. Propuesta → Propuesta técnica — HECHO (flujo IA+PDF definido)
3. Arquitectura → Doc arquitectura — HECHO (§8+§9)
4. Planificación → Backlog — HECHO (sesión `ProyectoLegal.md` §§42-61)
5. Desarrollo → Sistema funcional — HECHO (local 3 servicios + Docker 4 contenedores, 13+ docs en vivo)
6. QA → Reporte QA — PARCIAL (manual + lint/build/node-check/py_compile + Docker verificado 14/10; falta reporte formal)
7. Documentación → Manual — PARCIAL (README completo 14/10 + código comentado; falta manual usuario)
8. Mantenimiento → Plan — PENDIENTE
9. Capacitación → Acta — PENDIENTE `[PENDIENTE USUARIO: fecha y asistentes]`
10. Cierre → Informe — PENDIENTE `[PENDIENTE USUARIO: fecha cierre estadías]`

---

## 12. Descripción detallada (base punto 7 del PDF)

1. Detección — tipos y plantillas — Entregable requerimientos — HECHO
2. Propuesta — automatización + reglas — Entregable propuesta — HECHO
3. Arquitectura — componentes/APIs — Entregable arquitectura — HECHO
4. Planificación — backlog/cronograma — Entregable plan — HECHO
5. Desarrollo — generación/validación/versiones/aprobación — Entregable sistema — HECHO
6. Pruebas — funcional/integración/documental — Entregable QA — PARCIAL `[PENDIENTE USUARIO: anexa evidencias y ciclos #]`
7. Documentación — manuales — Entregable manual — PARCIAL
8. Mantenimiento — soporte/plantillas — Entregable plan — PENDIENTE
9. Capacitación — admin/usuarios — Entregable acta — PENDIENTE
10. Cierre — lecciones — Entregable informe — PENDIENTE

---

## 13. Riesgos y aceptación

**Riesgos:** machote desactualizado → versionar prompt; alucinación IA → dictamen humano obligatorio + pre-formalización; PII en logs → máscaras pendientes; 429 free → fallback + reintento 1 min; folio duplicado → imposible en auto (transacción + FOR UPDATE); manual queda a criterio con unicidad parcial.

**Aceptación global:**
- Crear los 11 tipos de punta a punta y verlos en Revisión/Seguimiento tras recargar.
- Rechazo sin comentario bloqueado (400). Borrado con Dialog propio.
- `npm run build` OK, `npx eslint .` limpio, `node --check` rutas OK, `py_compile` OK, `npm run db:test` OK.
- Trazabilidad por folio + historial + notificaciones verificables.

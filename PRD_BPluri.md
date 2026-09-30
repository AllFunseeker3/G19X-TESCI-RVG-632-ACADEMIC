# PRD_BPluri — Sistema Automatizado para la Elaboración de Cartas y Notificaciones Legales (Con contexto de residencia PluriOne)

**Versión:** 2.0 — 30/09/2026
**Estado:** Real / verificado contra código, BD y servicios en vivo
**Base:** `Requerimientos.pdf` puntos 3 al 7 + `Tipos de documentos legales.txt` + código real en `proyecto_resi`
**Nota:** este PRD describe lo que el sistema HACE hoy. PluriOne NO es despacho ni usuaria legal (ver §1).

---

## 1. Contexto de residencia — Empresa formadora (NO es empresa de leyes)

**Aclaración obligatoria:** PluriOne S.A. de C.V. (Develop Talent & Technology) es la empresa que asignó el proyecto como residencia / estadía. NO es un despacho jurídico, NO es cliente legal del sistema y sus nombres NO son roles del software.

**Datos de la empresa formadora (solo referencia académica, tomados del PDF):**
- Nombre: PluriOne S.A. de C.V. / Nombre Comercial: Develop Talent & Technology
- Dirección: Puebla 46, Colonia Roma Norte, Alcaldía Cuauhtémoc, C.P. 06700, Ciudad de México
- RFC: PLU060407HC9
- Sector: Privado | Tipo: Mediana | Giro: Servicios de Consultoría, Desarrollo de Software y Capacitación TI
- Contacto: 55 1900 3503 | contacto@develop.com.mx | Lunes a Viernes 09:00-18:00
- Responsable Programas de Estadías / Asesor Externo: Juan Méndez Herrera
- Líder de Proyecto / Evaluaciones: Edgar Loeffelmman

El sistema `SisLegal` es un caso LegalTech para un área jurídica genérica, desarrollado bajo esa residencia.

> `[PENDIENTE USUARIO: nombre del residente/autor, matrícula, carrera, periodo, asesor académico interno de tu escuela.]`
> `[PENDIENTE USUARIO: si tu jurado pide dependencia usuaria final distinta a "genérica", escríbela aquí. No uses PluriOne como usuaria.]`

---

## 2. Tecnologías REALES usadas (sustituye al punto 2 del PDF)

El punto 2 del PDF (`Python, FastAPI, React.js, Azure OpenAI Service, Azure AI Document Intelligence, PostgreSQL, Docker, GitHub Actions, LangChain, Microsoft Entra ID y Scrum`) **NO se usa tal cual**. Esto es lo que sí corre hoy:

**Front (`:5173`):**
- React 19 + Vite 8 + React Router 7
- MUI v9 + Emotion + Tailwind 3 (toda la UI es MUI, tema en `src/theme.js`, escala `html 87.5%`, drawer 210px, 4 acentos azul #163172 / rojo / verde / blanco + token `encabezado`)
- `src/Pages` (10): app, Ingreso, Inicio, GenerarCarta, Revision, Seguimiento, Clientes, Usuarios, plantillas, Configuracion
- `src/Components` (16): DashboardLayout, CampoFormulario, SeccionFormulario, ResumenDocumento, ProgresoIA, CentroNotificaciones, PermisosProvider, UsuariosAdmin, etc.
- `src/lib/api.js`: fetch con Bearer JWT, eventos `sislegal:sin-conexion` / `sesion-expirada`

**Back (`:8000`):**
- Express 4 + `mysql2` + MariaDB `sislegal` en `localhost:3306` + `jsonwebtoken` (JWT 8h) + `bcryptjs` + `cors` + `dotenv`
- Rutas `server/routes/` (8): auth, catalogo, clientes, documentos, ia (proxy), notificaciones, usuarios, salud
- `npm run todo` levanta API + web con concurrently.

**IA (`:8001`):**
- FastAPI + Uvicorn + LangChain (+ `langchain-openai`, `langchain-google-genai`) + `reportlab`
- Proveedor real: **OpenRouter**, modelo default `qwen/qwen3.8-27b:free` con fallback multi-modelo (`gemma-4-26b, gemma-4-31b, nemotron-3-ultra`). Key Google guardada solo como alternativa.
- Endpoints: `GET /salud`, `POST /redactar`, `POST /corregir`, `POST /pdf`
- PDFs en `documentos/Sistema legal/` (ignorada en git). Flag `IA_PRE_FORMALIZAR=1`.

**BD:** MariaDB, `db/maestro.sql` fuente de verdad (15 tablas). Migraciones aplicadas: ia_contenido, notificaciones, clientes_verificado.

| PDF punto 2 | Estado real |
|---|---|
| Python, FastAPI, React, LangChain | SÍ (FastAPI solo en ai-service) |
| Azure OpenAI Service | NO. OpenRouter free por costo |
| Azure AI Document Intelligence | NO. Sin OCR, solo reportlab |
| PostgreSQL | NO. Es MariaDB |
| Docker | NO |
| GitHub Actions | NO. Verificación manual build+lint |
| Microsoft Entra ID | NO. JWT propio sin SSO |
| Scrum | Solo documental |

---

## 3. Delimitación (punto 3 PDF + matiz real)

> "El sistema automatizará la generación de cartas, oficios, avisos y notificaciones legales mediante plantillas parametrizadas, reglas jurídicas y datos estructurados. Incorporará inteligencia artificial para redactar contenido, validar consistencia documental, gestionar flujos de aprobación y mantener trazabilidad y control de versiones."

Matiz real 30/09/2026: sí genera 11 tipos / 137 campos, sí redacta y formaliza con IA, sí aprueba y traza con historial; validación es formal + IA, la jurídica de fondo sigue siendo humana; versiones = historial + regeneración PDF, no versionado semántico de plantillas.

---

## 4. Objetivos (punto 4 PDF)

**General:** Desarrollar un sistema inteligente para la elaboración automatizada de cartas y notificaciones legales.

**Específicos (estado):**
1. Analizar procesos — HECHO. 2. Diseñar arquitectura — HECHO. 3. Implementar automatización y validación — HECHO parcial. 4. Validar calidad — PARCIAL (manual, sin suite auto). 5. Documentación y soporte — PARCIAL.

> `[PENDIENTE USUARIO: 1 párrafo por objetivo con evidencia de tu residencia.]`

---

## 5. Justificación (punto 5 PDF)

- Industria: menos tiempo y errores, machotes estándar, formalización automática (`lana→recursos`, etc.).
- Valor para PluriOne como formadora: caso LegalTech de bajo costo sin Azure para portafolio de residencias.
- Alumno: IA generativa, automatización documental, arquitectura de 3 servicios + RBAC.

> `[PENDIENTE USUARIO: justificación personal 3-5 líneas.]`

---

## 6. Alcance — HACE / NO HACE / NO HARÁ

### 6.1 HACE

**Generar:** Categoría→Tipo dependiente (4+11), forms por Box (poder 17, responsiva 19, renuncia 9, intención 14, petición 14, comisión 14, resolución 13, privacidad 9, rescisión 10, funcionamiento 9, notificación 9), campos texto/area/fecha dd-mm-aaaa con máscara+picker/email/seleccion/moneda/fotos/check/switch/anexos-PDF, destinatario opcional solo poder+intención, autocomplete Clientes + autorrelleno, validación bloqueante, flujo Resumen→IA solo-lectura→Corregir→Confirmar crea+PDF, modo `?editar=` con `PATCH /:id/datos`.

**IA:** 11 tipos, machote poder exacto + genérico 10 tipos, pre-formalización, Asimismo contextual, `/redactar|/corregir|/pdf` con fallback 429/503.

**PDF:** reportlab letter Times, poder con OTORGO/ACEPTO+TESTIGOS en un `KeepTogether` (`splitByRow=0`), genérico con firma única, guarda en `documentos/Sistema legal/`, descarga con login.

**Revisión:** bandeja real, Creado por, En revisión (=borrador), dictamen admin/super, rechazo exige comentario, visor PDF iframe 70vh, borrado con Dialog MUI, `DELETE CASCADE`.

**Seguimiento:** timeline real + motivo + Editar y corregir.

**Inicio:** KPIs reales, buscador en tabla, dona+actividad misma altura. Sin Vencimientos.

**Clientes:** Verificado/Pendiente, tabs, verificar, Persona/CURP vs Empresa/RFC, baja lógica. Alta no-admin nace pendiente.

**Usuarios:** alta con email auto + `SisLegal2026*`, base Legal/Operativo/Admin + switch super, matriz edita ROL, baja lógica. 5 base en `maestro.sql`.

**Notificaciones:** campanita, badge, hace-cuánto, fan-out crear (supers+admins) y dictamen (creador+motivo).

**Auth:** JWT 8h bcrypt 10, `RutaProtegida`+`VigilanteSesion`, heartbeat 30s. RBAC `PermisosProvider`.

**Config:** 4 acentos + oscuro, persistido.

### 6.2 NO HACE

Firma e.firma, OCR, SSO Entra, refresh-token/2FA, versionado plantillas, subida real fotos/anexos, móvil, CI/Docker, observabilidad, tests auto, Vencimientos.

### 6.3 NO HARÁ (este ciclo)

Poder Judicial/buzón tributario, facturación/multiempresa, migrar a Postgres/Azure/Entra sin re-plan, streaming IA, soporte 24/7.

> `[PENDIENTE USUARIO: mueve a fase 2 lo que te exija tu asesor con fecha.]`

---

## 7. Usuarios y roles del software (separados de PluriOne)

Administrador total / Super Legal / Super Operativo (solo su área, sin crear supers) / Legal / Operativo. Logins: `admin@sislegal.mx/Admin123*`, `legal/Legal123*`, `superlegal/SuperLegal123*`, `operativo/Operativo123*`, `superop/SuperOp123*`. Estados BD: borrador (UI En revisión), por_revisar, aprobado, rechazado, notificado.

Los nombres de PluriOne NO dictaminan ni aparecen en `documento_historial`; ahí solo aparecen usuarios del sistema.

---

## 8. Arquitectura real

```
[React :5173] --JWT--> [Express :8000] --mysql2--> [MariaDB sislegal :3306]
      |--- POST /api/ia/* ---> [FastAPI :8001] --> OpenRouter free
      |--- GET /api/ia/pdf/:archivo <-- [documentos/Sistema legal/]
```

---

## 9. Modelo de datos (`maestro.sql`, 15 tablas)

areas, roles, puestos, categorias, permisos_rol, usuarios, clientes (verificado), tipos_documento, campos_tipo (137), documentos (datos JSON, contenido MEDIUMTEXT, modelo_ia, id_cliente), documento_historial, adjuntos (solo-PDF), notificaciones, folios, auditoria. Seeds: 3 áreas, 5 roles, 20 permisos, 11 tipos, 137 campos, 10 puestos, 5 usuarios, Acme verificado.

---

## 10. RNF

IA free 20-90s, PDF <5s, JWT 8h, conexión BD con usuario `sislegal` (rotado 30/09), solo-PDF validado, labels fijos, crear poder <3 min sin IA, ESLint limpio, build OK (warning chunk preexistente), 1280px y 390px sin traslapes.

---

## 11. Cronograma (punto 6 PDF + estado)

1 Detección→requerimientos HECHO. 2 Propuesta HECHO. 3 Arquitectura HECHO. 4 Planificación HECHO. 5 Desarrollo HECHO. 6 QA PARCIAL. 7 Documentación PARCIAL. 8 Mantenimiento PENDIENTE. 9 Capacitación PENDIENTE `[PENDIENTE USUARIO: fecha/asistentes]`. 10 Cierre PENDIENTE `[PENDIENTE USUARIO: fecha cierre]`.

---

## 12. Descripción detallada (punto 7 PDF)

1 Detección HECHO. 2 Propuesta HECHO. 3 Arquitectura HECHO. 4 Planificación HECHO. 5 Desarrollo HECHO. 6 Pruebas PARCIAL `[PENDIENTE USUARIO: anexa ciclos]`. 7 Documentación PARCIAL. 8 Mantenimiento PENDIENTE. 9 Capacitación PENDIENTE. 10 Cierre PENDIENTE.

---

## 13. Riesgos y aceptación

Alucinación→humano obligatorio; 429→fallback+reintento; folios auto atómicos (FOL-01 30/09); PII sin cifrado columna. Aceptación: 11 tipos punta a punta tras recargar, rechazo sin comentario bloqueado, build+lint+node-check+py_compile+db:test OK, trazabilidad por folio.

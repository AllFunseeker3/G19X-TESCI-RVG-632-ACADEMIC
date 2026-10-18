# MVP — SisLegal (foto real de lo entregado 14/10/2026; base 30/09 intacta)

**Repo:** `proyecto_resi` — React 19 + Vite 8 + MUI 9 / Express 4 + MariaDB / FastAPI + LangChain + OpenRouter
**Base:** `PRD_A.md` / `PRD_BPluri.md` (misma funcionalidad), `Requerimientos.pdf` puntos 3-7, `Tipos de documentos legales.txt`
**Estado:** usable de punta a punta en local con 3 servicios arriba, y en Docker con 4 contenedores (`docker compose up`: db + ia + api + web `:8080`, verificado 14/10).

---

## 1. Qué es y qué no es

**ES:** lo que hoy corre con `npm run todo` (API :8000 + web :5173) más IA `:8001` (`uvicorn main:app` desde `ai-service/`), o con `docker compose up` (db + ia + api + web `:8080`). Un residente crea cualquiera de los 11 tipos, la IA redacta y formaliza, se genera PDF institucional, un revisor dictamina con motivo, el autor corrige con `?editar=`, todo queda trazado y notificado.

**NO ES:** un SaaS multiempresa, ni un sistema con SSO, ni OCR, ni firma e.firma, ni CI. Es un MVP local monousuario por sesión con RBAC por área (con despliegue Docker incluido).

---

## 2. HACE (P0 entregado y probado en vivo)

1. **Auth real:** `Ingreso.jsx → POST /api/auth/login` bcrypt+JWT 8h, `localStorage`, `RutaProtegida`+`VigilanteSesion`, heartbeat 30s. Usuarios: `admin/Legal123*/SuperLegal123*/Operativo123*/SuperOp123*` (`admin@sislegal.mx/Admin123*`).
2. **Catálogo 11/137:** 4 categorías, carta-poder 17, responsiva 19, renuncia 9, intención 14, petición 14, comisión 14, resolución 13, privacidad 9, rescisión 10, funcionamiento 9, notificación-general 9. Tipos de campo texto/area/fecha/email/seleccion/moneda/fotos/check/switch/anexos + `mostrarSi`.
3. **Generar → Resumen → IA → PDF:** valida→Resumen verifica→Redactar (`POST /api/ia/redactar`)→preview solo-lectura + `ProgresoIA` + Corregir (`POST /api/ia/corregir`)→Confirmar crea (`POST /api/documentos`) + PDF (`POST /api/ia/pdf`, reportlab). Poder con machote exacto + formalización; otros 10 con prompt genérico + firma única. Firmas poder en un `KeepTogether` indivisible.
4. **Revisión:** bandeja real, Creado por, En revisión, dictamen con comentario obligatorio al rechazar (400 si falta), visor PDF iframe 70vh, borrado con Dialog MUI, `DELETE CASCADE`, botón **Revisar documento** (sube PDF ≤10MB, IA clasifica 1 de 11 + extrae datos + veredicto APROBABLE/CORREGIBLE/RECHAZABLE; Editar genera carta nueva).
5. **Seguimiento:** timeline historial+adjuntos+responsable, motivo + Editar y corregir.
6. **Clientes verificado + autorrelleno:** tabla, chips, tabs, verificar (admin/super), Persona/CURP vs Empresa/RFC, autocomplete en Generar que solo rellena vacíos.
7. **Usuarios/supers:** alta con email auto + contraseña genérica inicial, matriz edita ROL, baja lógica. `PATCH /roles/:id/permisos`. Base precargada:

| Nombre | Correo | Pass | Rol / Área |
|---|---|---|---|
| Administrador | `admin@sislegal.mx` | `Admin123*` | Administrador / Administración (todo) |
| Abogada Legal | `legal@sislegal.mx` | `Legal123*` | Legal / Legal |
| Super Legal | `superlegal@sislegal.mx` | `SuperLegal123*` | Superusuario Legal / Legal |
| Operador | `operativo@sislegal.mx` | `Operativo123*` | Operativo / Operativa |
| Super Operativo | `superop@sislegal.mx` | `SuperOp123*` | Superusuario Operativo / Operativa |
8. **Notificaciones:** campanita, badge, hace-cuánto, fan-out crear (supers+admins) y dictamen (creador+motivo), refresco 30s.
9. **Inicio/Config (Plantillas oculta):** KPIs/buscador/dona/actividad reales, Config con 4 acentos + oscuro. Plantillas oculta del drawer (ruta `/Plantillas` viva); el flujo oficial es `/Menu` directo.
10. **Persistencia real:** MariaDB `sislegal` 14 tablas (`maestro.sql` fuente de verdad), `documentos/Sistema legal/*.pdf`, historial. Sin `documentosDemo.js`, sin cifras fijas.
11. **Folios auto FOL-01 + PDFs versionados ADJ-01 + BD con `sislegal`:** folio `PREFIJO-AAAA-NNN` atómico si no viene (manual se respeta; respuesta lo incluye y el front lo muestra); `adjuntos.vigente` con badge Actual/Versión anterior y DELETE que borra físicos; conexión rotada de root a `sislegal` el 30/09.
12. **Docker (14/10):** `docker-compose.yml` (db MariaDB 11 + ia + api + web nginx `:8080`), Dockerfiles por servicio, `.env.docker.example` sin secretos, CORS por env, healthcheck `mariadb-admin`. Verificado: 4 Up, db healthy, `/api/salud` 11/137/20/5, IA 11 plantillas, web 200.
13. **Limpieza LIM-01 (14/10):** DROP `auditoria` (sin uso) + DROP `clientes.contacto` (fuera del form); 15→14 tablas; `db/sislegal_schema.sql` borrado (duplicado de `maestro.sql`); migraciones NO fusionadas (trail de upgrade).

---

## 3. NO HACE / NO HARÁ en este MVP

- SSO Entra, refresh-token, 2FA, bloqueo intentos. JWT 8 h sin refresh (conexión BD ya rotada a `sislegal` el 30/09).
- Firma e.firma, buzón tributario, Poder Judicial.
- Subida real de fotos/anexos al servidor (viven en memoria del form; solo el PDF final persiste).
- Vencimientos en Inicio, versionado semántico plantillas, PWA/móvil, CI, Postgres/Azure, tests auto, soporte 24/7.

---

## 4. Historias cumplidas (evidencia)

| ID | Historia | Evidencia |
|---|---|---|
| HU-01 | Elegir categoría/tipo válidos | `SelectorCategoriaTipo.jsx`, Tipo disabled sin categoría, 11 tipos |
| HU-02 | Capturar + ver resumen + IA + corregir | `GenerarCarta→ResumenDocumento→ProgresoIA`, preview + retro |
| HU-03 | Guardar en revisión + PDF | `POST /documentos` borrador + `POST /api/ia/pdf` + Descargar PDF |
| HU-04 | Dictaminar con motivo | `Revision.jsx`, 400 sin comentario, visor PDF |
| HU-05 | Trazabilidad | `Seguimiento.jsx`, `documento_historial` |
| HU-06 | Dashboard útil | `Inicio.jsx` KPIs/buscador reales |
| HU-07 | Sesión + roles | JWT + `PermisosProvider.puede()` + `Usuarios.jsx` |
| HU-08 | Clientes verificados | `Clientes.jsx`, `verificado BOOLEAN`, autorrelleno |
| HU-09 | Avisos | Campanita + `notificaciones`, hace-cuánto |

---

## 5. Contratos API reales

```
POST /api/auth/login {correo, contrasena} → {token, usuario}
GET /api/salud → {version DB, 11 tipos, 137 campos}
GET /api/catalogo/categorias|tipos|campos?id_tipo=
POST /api/documentos {folio? (auto si vacío), id_tipo, datos, contenido, modelo_ia, id_cliente} → {id, estado, folio} en borrador
PATCH /api/documentos/:id/datos {datos, id_cliente} (borrador/rechazado, vuelve a borrador)
PATCH /api/documentos/:id/estado {estado, comentario} (rechazo exige comentario)
DELETE /api/documentos/:id
GET /api/documentos/:id (detalle + historial + adjuntos)
POST /api/ia/redactar {id_tipo, datos} → {contenido, modelo}
POST /api/ia/corregir {contenido, instruccion, id_tipo} → {contenido}
POST /api/ia/pdf {id_tipo, datos, contenido, id_documento} → {archivo}
GET /api/ia/pdf/:archivo → Blob PDF (con login)
GET /api/clientes (?solo_pendientes=1) / POST / PATCH /:id/verificar / DELETE
GET /api/notificaciones / PATCH /:id/leida / PATCH /leer-todas
GET /api/usuarios/yo/permisos → {permisos, admin, super}
```

---

## 6. DoD del MVP

- [x] 11 tipos crean folio visible en Revisión/Seguimiento tras recargar
- [x] Rechazo sin comentario bloqueado
- [x] Borrado sin `window.confirm`, con Dialog
- [x] KPIs/dona sin fijos
- [x] Login/logout + rutas protegidas
- [x] `npm run build` OK (warning chunk preexistente), `npx eslint .` limpio, `node --check` OK, `py_compile` OK, `db:test` OK (MariaDB 12.3.3, 11/137/20)
- [x] 1280px y 390px sin traslapes (labels fijos, escala 87.5%)
- [x] README con 5 puntos + ejecución local y Docker + credenciales demo (14/10)
- [x] Docker: 4 Up, db healthy, `/api/salud` 11/137/20/5, IA 11 plantillas, web 200 (14/10)
- [x] LIM-01: 14 tablas, CRUD clientes sin `contacto` OK (14/10)
- [ ] Manual usuario + acta capacitación + informe cierre `[PENDIENTE USUARIO: fechas y asistentes]`

---

## 7. Cómo probar (10 min)

**A. Local:** `npm run todo` (API :8000 + web :5173) + aparte IA (`cd ai-service; python -m uvicorn main:app --host 127.0.0.1 --port 8001`).
**B. Docker:** `docker compose up` → web `http://localhost:8080` (API :8000, IA :8001).

1. `/Ingreso` → `admin@sislegal.mx / Admin123*`.
2. `/Menu` → categoría Cartas + Carta Poder → verifica formulario.
4. Elige cliente Acme (verificado), captura, `Generar documento con IA` → verifica Resumen → Redactar → espera 20-90s free → pide una corrección → Confirmar y guardar → Descargar PDF.
5. `/Revision` → En revisión → dictamina Rechazar sin comentario (debe bloquear) → Rechazar con motivo.
6. `/Seguimiento` → verifica motivo + Editar y corregir → corrige → vuelve a revisión.
7. `/Revision` → Revisar documento → sube el PDF → verifica clasificación/veredicto → Editar genera carta nueva.
8. Campanita: verifica avisos en creador y supers. Recarga: todo persiste.

Si IA da `Servicio IA apagado` prende `:8001`. Si da `Modelo saturado (429)` espera 1 min o cambia `IA_MODEL` en `ai-service/.env`.

---

## 8. Después del MVP 

V1: subida real anexos + manual + refresh-token (README y Docker ya hechos).
V2: key de paga (3-15s, sin 429, streaming, `IA_PRE_FORMALIZAR=0`), validación jurídica asistida, QR en PDF.
V3: firma, buzón, CI, Postgres/Azure solo si lo exige la escuela (re-plan).

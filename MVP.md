# MVP — Sistema de Cartas y Notificaciones Legales

**Repo:** `proyecto_resi` (React + Vite + MUI)
**Base:** `PRD.md`, `Requerimientos.pdf`, `Tipos de documentos legales.txt`
**Versión:** 1.0 — 14/09/2026
**Objetivo MVP:** pasar del frontend con mocks a un flujo usable de punta a punta que genere, revise y trace documentos reales.

---

## 1. Qué es y qué no es el MVP

**Es:** la versión mínima que un residente puede usar para crear 1 de las 11 plantillas, enviarla a revisión, que un revisor la apruebe/rechace con comentario, y consultar su historial. Con persistencia real.

**No es:** no incluye IA generativa real, ni firma electrónica, ni OCR, ni SSO completo. Esos van en V1/V2.

## 2. Alcance del MVP (P0 obligatorio)

### Incluido
1. **Auth mínima funcional** (`Ingreso.jsx`): validación email/pass, sesión en localStorage, ruta protegida, logout real. Mock de 2 usuarios: residente / revisor.
2. **Generar documento** (`GenerarCarta.jsx`): Campo 1 + Campo 2 dependiente + formulario dinámico para las 11 plantillas ya definidas en `tiposDocumentos.js`. Guardar Borrador + Enviar a revisión. Validación required + email + fecha. Folio auto `DOC-AAAA-####`.
3. **Plantillas** (`plantillas.jsx`): galería actual + contador real de campos. `Usar plantilla` con preselección por query (ya funciona, mantener).
4. **Revisión** (`Revision.jsx`): filtros, tabla, dialog con datos + comentario obligatorio al rechazar. Solo `Por revisar` dictaminable. Cambio de estado persistente.
5. **Seguimiento** (`Seguimiento.jsx`): selector + ficha + stepper desde datos reales (no solo `DOCUMENTOS` estáticos).
6. **Inicio** (`Inicio.jsx`): KPIs, dona, actividad, buscador y vencimientos calculados desde store real. Eliminar `documentosBD` hardcodeado (150/75/75/200) y unificar con única fuente.
7. **Persistencia local primero:** Context + `localStorage` (o IndexedDB) con seed de `documentosDemo.js` (6 docs #101-#106). Prepara interfaz para migrar a FastAPI + PostgreSQL sin cambiar páginas.
8. **Notificaciones mínimas:** campanita actual pero alimentada por eventos reales (enviado, aprobado, rechazado).
9. **Trazabilidad:** todo cambio agrega `{etapa, fecha, responsable, comentario}`. Nunca se borra historial.

### Excluido del MVP (pasa a V1/V2)
- Azure OpenAI, LangChain, Document Intelligence (dejar `slots` en código con feature flag `IA_ENABLED=false`).
- Entra ID / SSO, RBAC fino, auditoría inmutable en servidor.
- Exportar PDF/DOCX real (MVP: resumen imprimible con `window.print()`).
- Backend FastAPI, PostgreSQL, Docker, GitHub Actions (diseñar contratos API en paralelo, no bloquear MVP).
- Firma, acuse, OCR, móvil.

## 3. Historias de usuario MVP

| ID | Historia | Criterios de aceptación |
|----|----------|-------------------------|
| HU-01 | Como residente quiero elegir categoría y tipo para que solo vea opciones válidas | Campo 2 disabled sin Campo 1; al cambiar Campo 1 se resetea Tipo+Datos; 11 tipos disponibles |
| HU-02 | Como residente quiero capturar datos dinámicos y ver resumen antes de confirmar | Todos los campos `requerido` validan; Dialog muestra `Categoría — Tipo` + etiqueta/valor; Confirmar guarda |
| HU-03 | Como residente quiero guardar Borrador y Enviar a revisión | Borrador no sale en Revisión; Enviar cambia a `Por revisar` + crea historial + notificación |
| HU-04 | Como revisor quiero filtrar y dictaminar con comentario | Tabs Todos/Por revisar/Aprobado/Rechazado filtran; Aprobar/Rechazar solo si `Por revisar`; Rechazar exige comentario |
| HU-05 | Como usuario quiero trazabilidad por folio | Seguimiento muestra ficha + stepper ordenado; tras recargar se conserva |
| HU-06 | Como residente quiero dashboard útil | KPIs = conteo real; dona suma 100%; buscador top 5 por folio/tipo/cliente; vencimientos por `limite` con chips correctos |
| HU-07 | Como usuario quiero sesión básica | Login inválido muestra error; login válido entra a `/Inicio`; rutas internas exigen sesión; Cerrar sesión vuelve a `/Ingreso` |

## 4. Backlog MVP priorizado (orden de ejecución)

1. **Store global + persistencia:** crear `src/store/DocumentosContext.jsx` (CRUD + historial + notificaciones) con `localStorage key=residencias_v1`. Migrar `Revision`, `Seguimiento`, `Inicio`, `CentroNotificaciones` a usarlo. Eliminar `documentosBD` duplicado. [2-3 días]
2. **Generar → guardar real:** conectar `GenerarCarta.jsx` al store. Botones: `Guardar borrador` + `Enviar a revisión` (hoy solo `Generar` abre Dialog). Limpiar resetea + query params. [2 días]
3. **Revisión persistente:** `dictaminar()` escribe en store, no solo `useState` local. Comentario obligatorio al rechazar. [1 día]
4. **Inicio real:** KPIs, dona, actividad, buscador, vencimientos desde store. Quitar números 150/75/75/200 fijos. Unificar `COLOR_HEX` + `COLOR_POR_ESTADO`. [1-2 días]
5. **Auth mínima + rutas protegidas:** `AuthContext`, `ProtectedRoute` en `app.jsx`, seed residente/revisor, Drawer muestra rol, fix `ml:15px` → layout con `Drawer` + `Toolbar` correcto, responsive. [1-2 días]
6. **QA + pulido:** `vite build`, `eslint`, prueba manual de las 11 plantillas, prueba recarga (persistencia), accesibilidad labels/foco, empty states. [1 día]

Total estimado: **2 semanas, 1 dev**.

## 5. Contratos API (para no retrabajar al meter backend)

Diseñar desde MVP aunque se mockee:
```
POST /auth/login {email, password} → {token, user}
GET /documentos?estado=&q= → [...]
POST /documentos {categoria, tipo, datos, limite} → {folio}
PATCH /documentos/{folio} {estado, comentario} → {documento}
GET /documentos/{folio}/historial → [...]
GET /plantillas → [{categoria, tipo, numCampos, version}]
```
El `DocumentosContext` debe exponer mismos métodos (`listar, crear, dictaminar, obtenerHistorial`) para swap por `fetch` después.

## 6. Definición de Listo (DoD) del MVP

- [ ] Las 11 plantillas crean folio que aparece en Revisión y Seguimiento tras recargar.
- [ ] No se puede aprobar/rechazar fuera de `Por revisar`.
- [ ] Rechazar sin comentario está bloqueado.
- [ ] KPIs y dona cuadran con tabla (0 datos fijos).
- [ ] Login/logout + rutas protegidas funcionan.
- [ ] `npm run build` y `npm run lint` en verde.
- [ ] Probado en Chrome/Edge 1280px y 390px sin traslapes.
- [ ] README actualizado con cómo correr MVP + credenciales demo.

## 7. Riesgos MVP y mitigación

- **Divergencia de datos (Inicio vs Revisión):** causa = dos fuentes (`documentosBD` vs `DOCUMENTOS`). Mitigación = store único (tarea 1).
- **Set-state durante render en `GenerarCarta`:** funciona pero es frágil. En MVP mantener patrón documentado; en V1 migrar a `useEffect`.
- **Notificaciones Legales sin subtipos:** mantener `notificacion-general` y agendar spike legal antes de V1.
- **Tablas duplicadas:** unificar `TablaGeneral` + tabla de `Revision` en un solo componente con prop `accion`.

## 8. Después del MVP

**V1 (backend real):** FastAPI + PostgreSQL + Entra ID + subida PDF + versionado plantillas + GitHub Actions + Docker.
**V2 (IA):** Azure OpenAI (redacción/validación) + LangChain + Document Intelligence + export PDF con folio QR + acuse.
**V3:** firma, buzón, analítica, móvil.

## 9. Cómo probar el MVP (manual, 10 min)

1. `npm install; npm run dev` → `/Ingreso` → login demo.
2. `/Plantillas` → Usar `Carta Poder` → verifica preselección en `/Menu`.
3. Captura datos → Enviar a revisión → verifica Dialog resumen.
4. `/Revision` → filtra Por revisar → Revisar → Rechazar sin comentario (debe bloquear) → Rechazar con comentario.
5. `/Seguimiento` → elige folio → verifica nuevo paso Rechazado.
6. Recarga página → todo sigue ahí (localStorage).
7. `/Inicio` → KPIs, dona, buscador `#101`, vencimientos coherentes.

---
*Si se aprueba este MVP, el siguiente paso es implementar el store global (tarea 1) sin cambiar la UI existente.*
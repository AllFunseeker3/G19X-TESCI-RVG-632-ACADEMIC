# PRD — Sistema Automatizado para la Elaboración de Cartas y Notificaciones Legales

**Empresa:** PluriOne S.A. de C.V. (Develop Talent & Technology)
**Dirección:** Puebla 46, Colonia Roma Norte, Cuauhtémoc, C.P. 06700, CDMX
**Representante Legal:** Xochicuahuitl Gleason Juárez
**Responsable Estadías / Asesor Externo:** Juan Méndez Herrera
**Líder de Proyecto:** Edgar Loeffelmman
**Versión:** 1.0 — 14/09/2026
**Estado:** Borrador para revisión
**Fuentes base:** `Requerimientos.pdf` + `Tipos de documentos legales.txt` + código actual en `src/`

---

## 1. Resumen ejecutivo

Sistema web para automatizar la generación de cartas, oficios, avisos y notificaciones legales mediante plantillas parametrizadas, reglas jurídicas, flujos de aprobación y trazabilidad completa.

Resuelve: tiempos altos de redacción, errores por copiado manual, falta de control de versiones y nula trazabilidad de quién creó / revisó / aprobó cada documento.

Stack objetivo (según `Requerimientos.pdf`): Python, FastAPI, React.js, Azure OpenAI Service, Azure AI Document Intelligence, PostgreSQL, Docker, GitHub Actions, LangChain, Microsoft Entra ID, Scrum.

Estado actual del repo (`proyecto_resi` — React + Vite + MUI + React Router): frontend funcional con datos mock, sin backend, sin IA real, sin persistencia.

## 2. Objetivos

### 2.1 Objetivo general
Desarrollar un sistema inteligente para la elaboración automatizada de cartas y notificaciones legales.

### 2.2 Objetivos específicos
1. Analizar procesos documentales y plantillas existentes.
2. Diseñar arquitectura tecnológica (frontend, backend, IA, datos).
3. Implementar automatización + validación jurídica.
4. Validar calidad documental (QA funcional y jurídica).
5. Elaborar documentación técnica, manual de usuario y plan de soporte multinivel.

## 3. Usuarios y roles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| Residente / Capturista | Crea documentos desde plantillas. Actual: usuario `Residente` en `DashboardLayout.jsx` | Generar, ver Seguimiento, ver Plantillas |
| Revisor Jurídico (J. Méndez) | Aprueba / rechaza con comentarios. Ref: `Revision.jsx` | Revisar, dictaminar, comentar |
| Aprobador Final (E. Loeffelmman) | Visto bueno final en historial demo | Aprobar, notificar |
| Administrador | Gestiona plantillas, usuarios, catálogos | CRUD plantillas, usuarios, auditoría |
| Sistema | Actúa en etapa `Notificado` | Cambiar estado a Notificado, generar acuse |

Login actual `src/Pages/Ingreso.jsx`: solo navega a `/Inicio`, sin auth real. PRD exige Microsoft Entra ID.

## 4. Alcance del producto

### 4.1 Dentro del alcance
- Catálogo de 4 categorías + 11 tipos (ver §6).
- Generación por formulario dinámico (`GenerarCarta.jsx` + `lib/tiposDocumentos.js`).
- Galería de plantillas (`plantillas.jsx`) con deep-link `/Menu?categoria=xxx&tipo=yyy`.
- Bandeja de revisión con filtros Todos / Por revisar / Aprobado / Rechazado (`Revision.jsx`).
- Seguimiento / trazabilidad por documento con stepper vertical (`Seguimiento.jsx`).
- Dashboard operativo (`Inicio.jsx`): KPIs, dona por estado, actividad reciente, buscador, vencimientos, tabla.
- Notificaciones in-app (`CentroNotificaciones.jsx`).
- Control de versiones, historial con etapa / fecha / responsable / comentario.
- Validación jurídica básica + IA generativa (redacción, consistencia).
- Exportación PDF / DOCX, firma y acuse (fase 2).

### 4.2 Fuera del alcance (v1)
- Firma electrónica avanzada / e.firma SAT.
- Integración con Poder Judicial / buzón tributario.
- OCR masivo de expedientes históricos (solo Azure AI Document Intelligence en fase posterior).
- App móvil nativa.

## 5. Requerimientos funcionales

### RF-01 Autenticación
- Login con correo + contraseña, Recordarme, Recuperar contraseña.
- Actual: formulario visual sin validación ni backend.
- Requerido: Entra ID (SSO), JWT, sesiones, roles, bitácora de accesos.
- Criterio: solo usuarios activos entran a `/Inicio`; `/Ingreso` redirige si ya hay sesión.

### RF-02 Dashboard / Inicio (`Inicio.jsx`)
- Banner con saludo por hora + conteo `Por revisar` y `Borrador`.
- 4 tarjetas KPI: Total, Aprobadas, Por revisar, Rechazadas (hoy hardcodeadas 150/75/75/200 — deben venir de API).
- Accesos directos a Generar / Revisar / Plantillas / Seguimiento.
- Dona `conic-gradient` por estado desde `DOCUMENTOS`.
- Actividad reciente: últimas 6 entradas de `historial` ordenadas desc.
- Buscador por folio/tipo/cliente (top 5).
- Próximos vencimientos por campo `limite`, con chip `Vencido / Vence hoy / mañana / en N días`.
- Tabla `documentosBD` (4 filas hardcodeadas — unificar con `DOCUMENTOS`).

### RF-03 Generar documento (`GenerarCarta.jsx` — ruta `/Menu`)
- Campo 1 `Categoría del documento` (requerido): Cartas, Oficios, Avisos, Notificaciones Legales.
- Campo 2 `Tipo de documento` (requerido, disabled hasta elegir Campo 1): dependiente según `TIPOS_POR_CATEGORIA`.
- Al cambiar Categoría → resetea Tipo + Datos. Al cambiar Tipo → resetea Datos.
- Formulario dinámico según `CAMPOS_POR_TIPO`: tipos `texto`, `email`, `fecha`, `area`, `seleccion`.
- Etiqueta fija arriba (componente `Etiqueta`), variante `standard` para evitar overlap.
- Botones Generar documento (abre Dialog Resumen) + Limpiar.
- Dialog Resumen: `nombreCategoria — nombreTipo` + lista etiqueta/valor + Cerrar / Confirmar.
- Preselección por query params desde Plantillas. Sincronización durante render con `claveAplicada`.
- Requerido futuro: guardar como Borrador en DB, validaciones por tipo (emails, fechas, folios únicos), autogenerar folio `OF-AAAA-####`, previsualización PDF real, enviar a revisión.

### RF-04 Plantillas (`plantillas.jsx` — ruta `/Plantillas`)
- 1 tarjeta por tipo (11 totales). Muestra icono, nombre, `N datos solicitados`.
- Botón `Usar plantilla` → `/Menu?categoria=&tipo=`.
- Requerido: versionado de plantillas, vista previa, activar/desactivar, conteo dinámico.

### RF-05 Revisión (`Revision.jsx` — ruta `/Revision`)
- Tabs filtro + tabla ID / Tipo / Cliente / Fecha / Estado / Acción.
- Dialog dictamen: ficha, `EstadoChip`, lista Datos capturados, textarea Comentario del revisor.
- Acciones Aprobar (success) / Rechazar (error), solo habilitadas si estado == `Por revisar`. Al dictaminar agrega entrada a `historial` con fecha hoy + responsable `J. Méndez`.
- Requerido: persistir dictamen, impedir doble dictamen, notificar al autor, adjuntar diff de versiones, motivo obligatorio al rechazar.

### RF-06 Seguimiento (`Seguimiento.jsx` — ruta `/Seguimiento`)
- Selector `NativeSelect` de documento + ficha (ID, tipo, cliente, fecha, chip) + `Stepper` vertical con etapa/fecha/responsable/comentario.
- Requerido: timeline desde backend, filtros por fecha, descarga de acuse, enlace a PDF final.

### RF-07 Tablas y estados (`TablaGeneral.jsx`, `EstadoChip.jsx`, `documentosDemo.js`)
- Estados canónicos: `Borrador (default gris)`, `Por revisar (warning)`, `Aprobado (success)`, `Rechazado (error)`, `Notificado (info)`.
- `COLOR_POR_ESTADO` + `COLOR_HEX` deben unificarse en un solo theme token.
- Transiciones permitidas: Borrador → Por revisar → Aprobado/Rechazado → Notificado. Rechazado → Borrador (corrección). No se permite Aprobado → Por revisar sin nueva versión.

### RF-08 Notificaciones (`CentroNotificaciones.jsx`)
- Campanita con badge, menú con lista, `Marcar todas como leídas`.
- Requerido: push real (SignalR / WebSocket / Azure Notification), centro con leídas/no leídas persistentes.

### RF-09 Layout y navegación (`DashboardLayout.jsx`, `app.jsx`)
- AppBar + Drawer permanente 240px (#163172), menú colapsable Cartas > Generar / Revisar / Seguimiento, Plantillas, Cerrar sesión.
- Rutas: `/`, `/Ingreso`, `/Inicio`, `/Plantillas`, `/Revision`, `/Seguimiento`, `/Menu`.
- Requerido: rutas protegidas por rol, 404, breadcrumbs, responsive Drawer temporal en móvil, corregir `ml:15px` actual que rompe alineación con Drawer fijo.

## 6. Catálogo documental (normativo)

Fuente: `Tipos de documentos legales.txt` + `src/lib/tiposDocumentos.js`.

**Categorías (`CATEGORIAS`):** `cartas` Cartas, `oficios` Oficios, `avisos` Avisos, `notificaciones` Notificaciones Legales.

**Tipos por categoría (`TIPOS_POR_CATEGORIA` — 11 total):**
- Cartas (4): carta-poder, carta-responsiva, carta-renuncia, carta-intencion
- Oficios (3): oficio-peticion, oficio-comision, oficio-resolucion
- Avisos (3): aviso-privacidad, aviso-rescision, aviso-funcionamiento
- Notificaciones (1 genérica pendiente de definir): notificacion-general

Cada tipo define 6-7 campos en `CAMPOS_POR_TIPO` (ver código para etiquetas exactas). Ejemplo carta-poder: otorgante*, apoderado*, facultades(area)*, vigencia, lugar*, fecha(fecha)*.

Regla: añadir nuevo tipo = 1 entrada en `TIPOS_POR_CATEGORIA` + 1 entrada en `CAMPOS_POR_TIPO` + plantilla DOCX/PDF + reglas de validación. Sin cambios de UI.

Pendiente: definir subtipos reales de Notificaciones Legales (hoy solo genérica).

## 7. Requerimientos no funcionales

| ID | Categoría | Requisito |
|----|-----------|-----------|
| RNF-01 | Rendimiento | LCP < 2.5s, generación PDF < 5s, búsqueda < 500ms con 10k docs |
| RNF-02 | Disponibilidad | 99.5% mensual, deploy con Docker + GitHub Actions |
| RNF-03 | Seguridad | Entra ID, RBAC, cifrado en tránsito/reposo, PII cifrada, auditoría inmutable |
| RNF-04 | Privacidad | Aviso de Privacidad propio, ARCO, minimización de datos, retención definida |
| RNF-05 | Accesibilidad | WCAG 2.1 AA, labels asociados (`htmlFor`), foco visible, teclado completo |
| RNF-06 | Usabilidad | Crear carta en < 3 min, 0 traslapes de labels (ya resuelto con `Etiqueta` fija) |
| RNF-07 | Mantenibilidad | ESLint, React Compiler, alias `@`, tests >70% |
| RNF-08 | Portabilidad | Chrome/Edge/Firefox últimos 2 años, responsive 360px-1440px |
| RNF-09 | Observabilidad | Logs estructurados, trazas LangChain, métricas IA (tokens, latencia, tasa aprobación) |
| RNF-10 | Cumplimiento | Trazabilidad total para auditoría jurídica |

## 8. Arquitectura propuesta

**Actual:** SPA React 19 + Vite + MUI v9 + React Router v7, theme `#163172`, datos en `documentosDemo.js`. Sin backend.

**Objetivo:**
```
[React SPA] → [FastAPI + LangChain] → [PostgreSQL + Blob Storage]
                 ↓
   [Azure OpenAI + AI Document Intelligence]
                 ↓
          [Entra ID / RBAC]
```
- Backend: FastAPI por dominio (documentos, plantillas, revisión, notificaciones, auditoría).
- IA: Azure OpenAI para redacción/validación + Document Intelligence para extraer datos de PDFs. LangChain orquesta prompts con reglas jurídicas versionadas.
- DB: PostgreSQL (documentos, versiones, historiales, plantillas). Blob para PDFs.
- DevOps: Docker, GitHub Actions (lint/test/build/deploy), entornos dev/stage/prod.

## 9. Modelo de datos mínimo

- `usuarios(id, nombre, email, rol, activo)`
- `categorias(id, nombre)` / `tipos_documento(id, categoria_id, nombre, version_plantilla)`
- `campos_tipo(tipo_id, key, etiqueta, tipo_input, requerido, opciones)`
- `documentos(id_folio, tipo_id, cliente, fecha_creacion, fecha_limite, estado, creador_id, version_actual)`
- `versiones_documento(id, documento_id, version, datos_json, pdf_url, creado_por, creado_en)`
- `historial(id, documento_id, etapa, fecha, responsable_id, comentario)`
- `notificaciones(id, usuario_id, texto, leida, fecha)`
- `plantillas(id, tipo_id, version, contenido, activa)`

Estados: Borrador, Por revisar, Aprobado, Rechazado, Notificado.

## 10. Métricas de éxito

- Tiempo medio de elaboración: -50% vs manual.
- Tasa de rechazo por errores formales: <10%.
- Documentos generados/mes, % aprobados al primer dictamen, tiempo medio Por revisar → dictamen.
- NPS interno área jurídica > 8.
- 0 incidentes de pérdida de trazabilidad.

## 11. Riesgos

1. Plantilla jurídica desactualizada → comité de validación + versionado obligatorio.
2. Alucinación IA → validación humana obligatoria antes de Aprobar, prompts con reglas cerradas.
3. PII expuesta → cifrado + máscaras en logs.
4. Alcance Notificaciones sin definir → spike legal antes del sprint 2.
5. Solo frontend mock → priorizar backend + persistencia en MVP v1 (ver `MVP.md`).

## 12. Criterios de aceptación global

- Crear cualquiera de las 11 plantillas de punta a punta y verla en Revisión y Seguimiento tras recargar (persistencia real).
- Dictaminar solo si `Por revisar`; el historial crece y la campanita avisa.
- Sin traslapes visuales, navegación por teclado completa, build `vite build` + `eslint` en verde.
- Trazabilidad auditable por folio.

## 13. Cronograma (base `Requerimientos.pdf`)

1. Detección necesidades → Doc requerimientos (hecho parcial).
2. Propuesta → Propuesta técnica.
3. Arquitectura → Doc arquitectura.
4. Planificación → Backlog + cronograma.
5. Desarrollo → Sistema funcional (actual: solo frontend).
6. QA → Reporte QA.
7. Documentación → Manual técnico/usuario.
8. Mantenimiento → Plan soporte multinivel.
9. Capacitación → Acta.
10. Cierre → Informe final.

---
*Generado para el repo `proyecto_resi`. Ajustar folios, límites y responsables con el área jurídica antes de sprint 1.*
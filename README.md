# SisLegal — Sistema Automatizado para la Elaboración de Cartas y Notificaciones Legales

## 1. Descripción de su proyecto

**SisLegal** es un sistema LegalTech para un área jurídica genérica que necesita **generar, revisar y trazar documentos legales** sin copiar/pegar machotes en Word.

- **Qué resuelve:** estandariza 4 categorías + **11 tipos** (cartas, oficios, avisos, notificaciones) en plantillas parametrizadas con **137 campos**, evita errores de destinatarios/fechas, y deja trazabilidad de quién creó, quién dictaminó y qué PDF es el vigente.
- **Cómo lo hace:** formulario dinámico por secciones (Box) + **IA que redacta, formaliza y corrige** (OpenRouter free, sin Azure por costo) + **PDF institucional** (reportlab) + flujo **En revisión → Aprobado/Rechazado** con motivo + notificaciones + folios automáticos + PDFs versionados.
- **Estado:** MVP funcional verificado en vivo de 2 formas: local (API `:8000` + web `:5173` + IA `:8001`, MariaDB `sislegal`) y Docker (web `:8080` + API `:8000` + IA `:8001` + DB `:3306`). No es SaaS multiempresa, no tiene SSO/OCR/firma e.firma/CI.
- **Base académica:** `Requerimientos.pdf` puntos 3–7 + `Tipos de documentos legales.txt`. Las tecnologías del PDF eran recomendación; aquí se documenta el stack real.

### Alcance en una frase
Un residente crea cualquiera de los 11 tipos, la IA redacta y formaliza, se genera PDF, un revisor dictamina con motivo, el autor corrige con `?editar=`, todo queda trazado, foliado y notificado.

---

## 2. Funcionalidades

### 2.1 Catálogo (4 categorías, 11 tipos)

| Categoría | Tipo | Campos | Particularidad |
|---|---|---|---|
| Cartas | Poder | 17 | Machote exacto OTORGO/ACEPTO/TESTIGOS indivisible, destinatario opcional, formaliza|
| Cartas | Responsiva | 19 | Moneda `$`, fotos JPG/PNG |
| Cartas | Renuncia | 9 | `numeroEmpleado`, motivo Otro |
| Cartas | Intención | 14 | Emisora/receptora, checks confidencialidad/vinculante, destinatario opcional |
| Oficios | Petición | 14 | Art. 8 switch, ccp condicional, anexos solo-PDF con preview |
| Oficios | Comisión | 14 | Viáticos condicional, fechas manuales inicio/fin |
| Oficios | Resolución | 13 | Considerandos + puntos resolutivos `filas:5`, autoridad que resuelve |
| Avisos | Privacidad | 9 | Integral/Simplificado/Corto, transferencia switch |
| Avisos | Rescisión | 10 | Art. 47 I–XV + XIV Bis, causa `filas:6` |
| Avisos | Funcionamiento | 9 | `autoridadDestino` + RFC obligatorios |
| Notificaciones | General | 9 | Acuse switch (Nombre/Firma/Fecha/Hora) |

Campos: texto, area (`filas`), fecha `dd/mm/aaaa` con máscara + picker nativo, email, selección, moneda, fotos, check, switch, anexos solo-PDF. `mostrarSi` condicional con limpieza auto. Solo `id==='fecha'` trae hoy auto.

### 2.2 Generar (`/Menu`)
Selector Categoría → Tipo dependiente, autocomplete Clientes (chip Sin verificar, solo rellena vacíos), validación bloqueante con `errores`. Flujo: `Generar documento con IA` → **Resumen** (verificar) → Redactar (preview solo-lectura + `ProgresoIA` por fases + cronómetro) → cuadro *¿Algo está mal?* + Corregir repetible → Confirmar crea + PDF. Modo `?editar=` precarga + banner con motivo (vuelve a borrador + re-avisa).

### 2.3 Revisión (`/Revision`)
Bandeja real, *Creado por*, tab En revisión (=borrador), filtros, Borrar con Dialog MUI, dictamen admin/super (rechazo exige comentario 400), visor PDF 70vh, botón **Revisar documento**: sube PDF externo ≤10MB, la IA clasifica 1 de 11, extrae datos, da veredicto APROBABLE/CORREGIBLE/RECHAZABLE + hallazgos; Editar genera carta **nueva** con folio auto.

### 2.4 Seguimiento (`/Seguimiento`)
Timeline historial + adjuntos + responsable, motivo rojo/verde + *Editar y corregir* (`/Menu?editar=#id`, creador/admin en borrador/rechazado).

### 2.5 Clientes (`/Clientes`), Usuarios (`/Usuarios`), Inicio, Config
- Clientes: chips Verificado/Pendiente, tabs Todos/Pendientes, Verificar (admin/super), Persona/CURP vs Empresa/RFC, baja lógica. Alta operativo→pendiente; edición ajena sobre verificada→pendiente.
- Usuarios: alta Nombre/paterno/materno, email auto ASCII, contraseña temporal (correo sin @ + 4 aleatorios, se muestra al crear) que es obligatorio cambiar en el primer ingreso (la API bloquea hasta cambiarla), selector Legal/Operativo/Administrador + switch super (solo admin). Matriz edita el ROL (afecta a todos), baja lógica + reactivar.
- Inicio: KPIs/buscador/dona/actividad reales (sin fijos). Sin Vencimientos.
- Config: 4 acentos (azul #163172/rojo/verde/blanco) + oscuro, persiste localStorage. Plantillas oculta del menú (ruta `/Plantillas` viva).

### 2.6 Transversales
Auth JWT 8h + `RutaProtegida`/`VigilanteSesion` + heartbeat 30s, RBAC por área (`PermisosProvider.puede()`), notificaciones con hace-cuánto (30s refresh), folios `PREFIJO-AAAA-NNN` atómicos, adjuntos `vigente`, solo-PDF validado front+back, firmas poder en un `KeepTogether` (`splitByRow=0`).

---

## 3. Cómo pueden usarlo los usuarios

### 3.1 Perfiles
- **Operativo/Legal:** crea y corrige sus documentos, usa clientes, recibe dictamen con motivo.
- **Super (por área):** verifica clientes, dictamina su área, gestiona usuarios normales de su área.
- **Administrador:** todo + crea admins/supers + verifica + dicta en cualquier área.

### 3.2 Puesta en marcha — Opción A: local (15 min)

**Requisitos:** Node 20+, Python 3.12+, MariaDB 10.6+/11+ en 3306, key OpenRouter `:free`.

```bash
npm install
npm install --prefix server
cd ai-service && pip install -r requirements.txt && cd ..
```

**`.env` (nunca en git):**
```bash
# .env (copia de .env.example)
VITE_API_URL=http://localhost:8000/api
# server/.env (copia de server/.env.example)
DB_HOST=localhost
DB_PORT=3306
DB_USER=sislegal
DB_PASSWORD=CAMBIA_ESTA_CONTRASENA
DB_NAME=sislegal
JWT_SECRET=CAMBIA_ESTE_SECRETO_LARGO
JWT_HORAS=8
API_PORT=8000
# ai-service/.env (copia de ai-service/.env.example)
OPENROUTER_API_KEY=sk-or-v1-TU-CLAVE
IA_MODEL=qwen/qwen3.8-27b:free
IA_PORT=8001
IA_PRE_FORMALIZAR=1
```

**BD:** `db/maestro.sql` es la fuente de verdad (14 tablas + seeds). Instalación nueva: `mysql -u root -p < db/maestro.sql`. BD vieja (pre-LIM-01): aplica `db/migracion_limpieza_01.sql` (quita `auditoria` + `clientes.contacto`). Luego `npm run db:test --prefix server`.

**Arranque:**
```bash
npm run todo            # API :8000 + web :5173
python -m uvicorn main:app --host 127.0.0.1 --port 8001  # desde ai-service/
```

**Demo:** `/Ingreso` en `http://localhost:5173` → `admin@sislegal.mx / Admin123*`. Son **5 cuentas de prueba** (una por rol: administrador, legal, super legal, operativo y super operativo), precargadas en `maestro.sql` para probar las funciones, permisos y flujo de dictamen del software; **no son usuarios reales** (detalle de las 5 en `MVP.md`).

### 3.2b Puesta en marcha — Opción B: Docker (recomendada para demo)

**Requisitos:** Docker Desktop Running + key OpenRouter `:free`. No necesitas Node/Python/MariaDB locales (van en contenedores).

**Archivos Docker (ya en el repo):** `docker-compose.yml` (db + ia + api + web), `server/Dockerfile`, `ai-service/Dockerfile`, `Dockerfile.web` + `nginx.conf`, `.dockerignore`, `.env.docker.example`.

```powershell
copy .env.docker.example .env
notepad .env
# cambia mínimo: JWT_SECRET (cadena larga) + OPENROUTER_API_KEY (sk-or-v1-...)
docker compose up --build
# primera vez tarda (MariaDB + npm + pip); las siguientes: docker compose up
```

**Abre:**
- Web: `http://localhost:8080` → `admin@sislegal.mx / Admin123*` (cuentas de prueba por rol; detalle en §3.2 **Demo**)
- API: `http://localhost:8000/api/salud` → `{tipos:11, campos:137, permisos:20, usuarios:5}`
- IA: `http://localhost:8001/salud` → `{proveedor, modelo, plantillas:11}`
- BD: `localhost:3306` (user/pass de tu `.env`, BD `sislegal` con seeds de `maestro.sql`)

**Comandos:**
```powershell
docker compose ps                    # estado (db healthy, api/ia/web Up)
docker compose logs -f api ia         # logs
docker compose down                   # apaga (conserva BD en db_data y PDFs en pdfs)
docker compose down -v                # borra BD y PDFs (limpio)
docker compose up --build web         # rebuild solo web tras cambiar front
```

**Notas Docker:**
- El navegador llama a `VITE_API_URL` (`http://localhost:8000/api`); el `api` habla con la IA por `IA_URL=http://ia:8001` (red interna).
- PDFs en volumen compartido `pdfs` (`PDF_DIR=/app/pdfs` en api e ia).
- Si `ports are not available ... 8000`: para tu API local (`Ctrl+C` en `npm run todo`) o la IA `:8001`.
- Si `db unhealthy`: `docker inspect sislegal-db-1 --format "{{json .State.Health}}"` (ya corregido a `mariadb-admin`).

### 3.3 Uso diario por rol (rutas)
1. Crear: `/Menu` → categoría/tipo → cliente → capturar → IA → Confirmar → Descargar PDF (folio en alerta).
2. Dictaminar: `/Revision` → En revisión → Aprobar o Rechazar con motivo → el creador recibe campanita.
3. Corregir: `/Seguimiento` → motivo → Editar y corregir → `/Menu?editar=` → Confirmar (nuevo PDF = Actual, anterior = histórico).
4. Revisar externo: `/Revision` → Revisar documento → subir PDF → ver veredicto → Cerrar/Editar.
5. Verificar cliente: `/Clientes` → tabs → Verificar (admin/super).
6. Gestionar: `/Usuarios` → alta/editar rol/baja-reactivar. `/Inicio` para KPIs y búsqueda.

### 3.4 Reglas que deben respetar
Fechas `dd/mm/aaaa`, anexos solo PDF (error explícito), destinatario opcional solo poder/intención, rechazo sin comentario se bloquea, fotos/anexos del form viven en memoria (solo el PDF final persiste), IA free tarda 20-90s y puede dar 429 → esperar 1 min.

---

## 4. Donde los usuarios pueden encontrar ayuda sobre su proyecto

- **Este README:** instalación, uso diario y límites.
- **En el repo:** `MVP.md` (foto real + cómo probar 10 min + DoD), `PRD_A.md` (genérico técnico), `PRD_BPluri.md` (contexto residencia), `AGENTS.md` (12 reglas UI + RBAC + IA + pendientes), `Archivos sobre el proyecto/*.docx` (propuesta + arquitectura; nota: dicen folio manual pre-FOL-01).
- **En la app:** subtítulos y ayudas por campo (`ayuda`), tooltips, alertas de error/success, `EstadoConexion` + botón Reintentar.
- **Diagnóstico rápido:**
  - `Servicio IA apagado` → prende `:8001`. `Modelo saturado (429)` → espera o cambia `IA_MODEL`.
  - `EADDRINUSE` → `Get-NetTCPConnection -LocalPort 8000,5173 | % { taskkill /PID $_.OwningProcess /T /F }`.
  - Verificación: `npx eslint .`, `npm run build`, `npm run db:test --prefix server`, `GET /api/salud`.
- **Soporte:** al ser residencia local, el soporte es el equipo autor (§5) + asesor externo. No hay mesa 24/7. Para bugs abre un issue en GitHub con pasos, folio/ID, captura y logs de `server/` + `ai-service/`.

---

## 5. Autores del proyecto

- **Empresa formadora (residencia, NO despacho usuario):** PluriOne S.A. de C.V. / Develop Talent & Technology — Puebla 46, Roma Norte, CDMX — RFC PLU060407HC9 — 55 1900 3503 | contacto@develop.com.mx.
- **Responsables académicos (según `Requerimientos.pdf`):** Programas de Estadías / Asesor Externo: Juan Méndez Herrera; Líder de Proyecto / Evaluaciones: Edgar Loeffelmman; Representante Legal: Xochicuahuitl Gleason Juárez.
- **Desarrollo y repo:** `AllFunseeker3` — https://github.com/AllFunseeker3/G19X-TESCI-RVG-632-ACADEMIC (`main`, HEAD `4ca9312`: Docker + README ejecución + LIM-01).
- `[nombre del residente/autor:Ricardo Velásquez Galicia, matrícula: 213107015 , carrera: Ingenieria en Sistemas Computacionales,  asesor académico interno: Mtra. Teresita Del Niño de Jesús Arriaga Sierra]`

---

## 6. Declaración de uso de Inteligencia Artificial

Como parte de la entrega académica, y atendiendo el criterio de la evaluación, se declara de forma explícita lo siguiente:

- **¿Se usó IA para programar?** **Sí.** El proyecto se desarrolló con apoyo de herramientas de IA generativa: asistentes de código (GitHub Copilot) y agentes de IA basados en LLM (OpenCode, con modelos tipo Claude, GPT y Qwen) usados como copiloto de desarrollo.
- **¿Para qué se usó?** Andamiaje y refactor de componentes React/MUI, escritura y depuración de rutas Express (`server/`) y endpoints FastAPI (`ai-service/`), redacción y corrección del esquema SQL (`db/`), generación de documentación (README, PRD, MVP, manuales, actas) y revisión de estilo (`eslint`/`prettier`).
- **¿Qué no se delegó?** Las decisiones de arquitectura, el modelo de datos, las reglas de negocio (RBAC por área, folios automáticos, versionado de PDF, estados del documento), el diseño de la interfaz y la validación final en vivo las definió y verificó el equipo autor.
- **Verificación humana obligatoria.** Todo cambio generado con IA fue revisado, probado en vivo (`npx eslint .`, `npm run build`, `npm run db:test`, flujo end-to-end en `:8080`) y corregido por el autor; ningún cambio se aceptó sin pasar esas pruebas.
- **La IA dentro del producto es una funcionalidad, no una ayuda de programación.** SisLegal integra IA en su operación (redactar, formalizar, corregir y revisar PDFs) a través de `ai-service` (FastAPI + LangChain) y OpenRouter. Eso forma parte del software entregado.

> Se declara con transparencia para que el uso de IA se considere una **herramienta de apoyo** al trabajo del autor, y no un sustituto de su criterio, diseño y validación.

---

## Apéndice técnico (para revisores)

- **Contratos:** ver `MVP.md §5` (auth, catálogo, documentos, IA redactar/corregir/revisar/pdf, clientes, notificaciones, usuarios).
- **Modelo:** `db/maestro.sql` 14 tablas (areas, roles, puestos, categorias, permisos_rol, usuarios, clientes, tipos_documento, campos_tipo 137, documentos JSON+contenido+modelo_ia+id_cliente+folio, historial, adjuntos solo-PDF+vigente, notificaciones, folios).
- **Verificado:** `eslint` limpio, `build` OK (warning chunk preexistente), `node --check`, `py_compile`, `db:test` OK + Docker verificado 2026-10-14 (4 Up, `db healthy`, `/api/salud` 11/137/20/5, `/salud` IA 11 plantillas, web 200). Docs reales de prueba descritos en sesión interna.
- **NO hace:** SSO/refresh/2FA, OCR, e.firma, uploads reales anexos, vencimientos, versionado plantillas, CI, Postgres/Azure, tests auto, PWA.

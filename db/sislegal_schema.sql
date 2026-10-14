-- ============================================================================
-- SISLEGAL · Esquema MariaDB (DBMaria -> BD `sislegal`)
-- Proyecto: Sistema de Residencias / Documentos legales (proyecto_resi)
-- Motor: InnoDB + utf8mb4. Compatible con MariaDB 10.2+ (usa columnas JSON).
--
-- CÓMO EJECUTARLO EN DBEAVER:
--   1) Conéctate a DBMaria y abre un "SQL Editor" (Ctrl+[).
--   2) Pega este script o ábrelo con Archivo -> Abrir.
--   3) Ejecútalo completo (Alt+X). Crea la BD, las 14 tablas y los seeds.
--   4) Verifica con las consultas del BLOQUE 4 (al final).
--
-- QUÉ GUARDA CADA TABLA:
--   areas, roles, permisos_rol .... control de acceso (quién ve/crea/qué).
--   usuarios ..................... personas del sistema (hash, NUNCA claro).
--   clientes ..................... empresas/personas destinatarias.
--   categorias, tipos_documento,
--   campos_tipo .................. CATÁLOGO (espejo de tiposDocumentos.js del
--                                  front; el programa lo lee por API).
--   documentos ................... cartas/oficios/avisos generados (datos JSON).
--   documento_historial .......... trazabilidad de estados (revisión).
--   adjuntos ..................... metadatos de PDFs/fotos (el archivo vive en
--                                  disco/objeto, aquí solo su ficha).
--   folios ....................... consecutivos atómicos por tipo+año.
-- ============================================================================

-- ================= BLOQUE 1: BD ============================================
CREATE DATABASE IF NOT EXISTS sislegal
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sislegal;

-- ================= BLOQUE 2: TABLAS ========================================

-- Áreas de la empresa (para agrupar usuarios y acotar superusuarios).
CREATE TABLE IF NOT EXISTS areas (
  id_area     INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(60) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NULL,
  activa      BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- Roles. `es_super` = puede gestionar usuarios de SU área.
-- El admin (id_area NULL) es global: ve todo y gestiona a todos.
-- `puede_gestionar_usuarios` = flag para superusuarios (pueden crear/gestionar usuarios de su área).
CREATE TABLE IF NOT EXISTS roles (
  id_rol        INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(60) NOT NULL UNIQUE,
  id_area       INT NULL,
  descripcion   VARCHAR(255) NULL,
  es_super      BOOLEAN NOT NULL DEFAULT FALSE,
  puede_gestionar_usuarios BOOLEAN NOT NULL DEFAULT FALSE,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_roles_area FOREIGN KEY (id_area)
    REFERENCES areas (id_area)
) ENGINE=InnoDB;

-- Catálogo de puestos (para el select de "Puesto" en Usuarios).
-- Si necesitas más puestos, agrégalos aquí o con INSERT en DBeaver.
CREATE TABLE IF NOT EXISTS puestos (
  id_puesto INT AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL UNIQUE,
  activo    BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- Catálogo Campo 1 (mismos ids que el front: cartas/oficios/avisos/...).
-- NOTA DE ORDEN: va ANTES de permisos_rol porque esa tabla la referencia por FK.
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria VARCHAR(30) PRIMARY KEY,
  nombre       VARCHAR(80) NOT NULL,
  activa       BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- Matriz de permisos: qué puede hacer cada rol en cada categoría.
-- El back-end la consulta en cada endpoint (nunca confíes solo en el front).
CREATE TABLE IF NOT EXISTS permisos_rol (
  id_rol                   INT NOT NULL,
  id_categoria             VARCHAR(30) NOT NULL,
  puede_ver                BOOLEAN NOT NULL DEFAULT FALSE,
  puede_crear              BOOLEAN NOT NULL DEFAULT FALSE,
  puede_modificar          BOOLEAN NOT NULL DEFAULT FALSE,
  puede_eliminar           BOOLEAN NOT NULL DEFAULT FALSE,
  puede_gestionar_usuarios BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id_rol, id_categoria),
  CONSTRAINT fk_perm_rol FOREIGN KEY (id_rol)
    REFERENCES roles (id_rol),
  CONSTRAINT fk_perm_cat FOREIGN KEY (id_categoria)
    REFERENCES categorias (id_categoria)
) ENGINE=InnoDB;

-- Usuarios del sistema. La contraseña JAMÁS se guarda en claro:
-- el back-end guarda aquí el hash bcrypt/argon2.
-- puesto/telefono/fecha_ingreso: datos laborales del usuario interno.
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(120) NOT NULL,
  correo          VARCHAR(150) NOT NULL UNIQUE,
  hash_contrasena VARCHAR(255) NOT NULL,
  id_rol          INT NOT NULL,
  id_area         INT NOT NULL,
  puesto          VARCHAR(100) NULL,
  telefono        VARCHAR(40) NULL,
  fecha_ingreso   DATE NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol)
    REFERENCES roles (id_rol),
  CONSTRAINT fk_usuarios_area FOREIGN KEY (id_area)
    REFERENCES areas (id_area)
) ENGINE=InnoDB;

-- Clientes / contrapartes (destinatarios, empresas, dependencias).
-- tipo_cliente distingue persona 'fisica' de 'moral'; curp solo aplica a físicas.
-- verificado: TRUE si lo dio de alta admin/super; los de otros usuarios
-- quedan pendientes hasta que un admin/super los verifique.
CREATE TABLE IF NOT EXISTS clientes (
  id_cliente INT AUTO_INCREMENT PRIMARY KEY,
  tipo_cliente ENUM('fisica','moral') NOT NULL DEFAULT 'moral',
  nombre     VARCHAR(150) NOT NULL,
  rfc        VARCHAR(20) NULL,
  curp       VARCHAR(20) NULL,
  domicilio  VARCHAR(255) NULL,
  correo     VARCHAR(150) NULL,
  telefono   VARCHAR(40) NULL,
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  verificado BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Catálogo Campo 2 (mismos ids que el front: carta-poder, oficio-..., ...).
CREATE TABLE IF NOT EXISTS tipos_documento (
  id_tipo      VARCHAR(40) PRIMARY KEY,
  id_categoria VARCHAR(30) NOT NULL,
  nombre       VARCHAR(80) NOT NULL,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_tipos_cat FOREIGN KEY (id_categoria)
    REFERENCES categorias (id_categoria)
) ENGINE=InnoDB;

-- Campos de cada tipo (para armar el formulario dinámico desde la BD).
--  tipo_campo: texto|area|fecha|email|seleccion|moneda|fotos|check|switch|anexos
--  opciones: JSON array solo para 'seleccion' (NULL en el resto).
--  cond_campo/cond_valor: equivalen a mostrarSi {campo, valor} ('true' p/bool).
CREATE TABLE IF NOT EXISTS campos_tipo (
  id_campo    INT AUTO_INCREMENT PRIMARY KEY,
  id_tipo     VARCHAR(40) NOT NULL,
  campo       VARCHAR(50) NOT NULL,
  etiqueta    VARCHAR(150) NOT NULL,
  tipo_campo  ENUM('texto','area','fecha','email','seleccion',
                   'moneda','fotos','check','switch','anexos') NOT NULL,
  requerido   BOOLEAN NOT NULL DEFAULT FALSE,
  opciones    JSON NULL,
  filas       INT NULL,
  ayuda       TEXT NULL,
  cond_campo  VARCHAR(50) NULL,
  cond_valor  VARCHAR(50) NULL,
  orden       INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_tipo_campo (id_tipo, campo),
  CONSTRAINT fk_campos_tipo FOREIGN KEY (id_tipo)
    REFERENCES tipos_documento (id_tipo)
) ENGINE=InnoDB;

-- Documentos generados. `datos` = JSON con todos los valores del formulario
-- (el front hoy los tiene en tiposDocumentos.js; misma estructura de claves).
-- `folio` = folio del sistema PREFIJO-AAAA-NNN (auto FOL-01 si no viene; UNIQUE por tipo).
-- OJO: no confundir con los campos de formulario `folio`/`folioEntrega`/`folioRecibe`
-- (números de oficio/identificación que escribe el usuario y viven dentro de `datos`).
CREATE TABLE IF NOT EXISTS documentos (
  id_documento INT AUTO_INCREMENT PRIMARY KEY,
  folio        VARCHAR(50) NULL,
  id_tipo      VARCHAR(40) NOT NULL,
  id_cliente   INT NULL,
  id_creador   INT NOT NULL,
  id_area      INT NOT NULL,
  estado       ENUM('borrador','por_revisar','aprobado',
                    'rechazado','notificado') NOT NULL DEFAULT 'borrador',
  datos        JSON NOT NULL,
  creado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tipo_folio (id_tipo, folio),
  CONSTRAINT fk_docs_tipo FOREIGN KEY (id_tipo)
    REFERENCES tipos_documento (id_tipo),
  CONSTRAINT fk_docs_cliente FOREIGN KEY (id_cliente)
    REFERENCES clientes (id_cliente),
  CONSTRAINT fk_docs_creador FOREIGN KEY (id_creador)
    REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_docs_area FOREIGN KEY (id_area)
    REFERENCES areas (id_area)
) ENGINE=InnoDB;

-- Trazabilidad: cada cambio de estado con responsable y comentario.
CREATE TABLE IF NOT EXISTS documento_historial (
  id_historial    INT AUTO_INCREMENT PRIMARY KEY,
  id_documento    INT NOT NULL,
  estado_anterior ENUM('borrador','por_revisar','aprobado',
                       'rechazado','notificado') NULL,
  estado_nuevo    ENUM('borrador','por_revisar','aprobado',
                       'rechazado','notificado') NOT NULL,
  id_responsable  INT NOT NULL,
  comentario      TEXT NULL,
  creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hist_doc FOREIGN KEY (id_documento)
    REFERENCES documentos (id_documento) ON DELETE CASCADE,
  CONSTRAINT fk_hist_resp FOREIGN KEY (id_responsable)
    REFERENCES usuarios (id_usuario)
) ENGINE=InnoDB;

-- Ficha de cada archivo anexo (el binario vive en disco/objeto, NO en la BD).
-- REGLA: solo PDF (CHECK) y sin límite de tamaño (tamano_bytes solo se registra).
CREATE TABLE IF NOT EXISTS adjuntos (
  id_adjunto   INT AUTO_INCREMENT PRIMARY KEY,
  id_documento INT NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo_mime    VARCHAR(100) NULL,
  tamano_bytes BIGINT NULL,
  ruta         TEXT NOT NULL,
  vigente      BOOLEAN NOT NULL DEFAULT TRUE, -- ADJ-01: solo el más reciente es vigente.
  id_subido_por INT NOT NULL,
  subido_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_adj_solo_pdf CHECK (tipo_mime IS NULL OR tipo_mime = 'application/pdf'),
  CONSTRAINT fk_adj_doc FOREIGN KEY (id_documento)
    REFERENCES documentos (id_documento) ON DELETE CASCADE,
  CONSTRAINT fk_adj_user FOREIGN KEY (id_subido_por)
    REFERENCES usuarios (id_usuario)
) ENGINE=InnoDB;
CREATE INDEX IF NOT EXISTS idx_adj_doc_vig ON adjuntos (id_documento, vigente);

-- Campanita de avisos: una fila por destinatario (supers del área + admins)
-- cada vez que se crea un documento. `leida` la apaga el front al abrir la campana.
CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario      INT NOT NULL,
  tipo            VARCHAR(40) NOT NULL DEFAULT 'documento_creado',
  titulo          VARCHAR(200) NOT NULL,
  detalle         VARCHAR(500) NULL,
  id_documento    INT NULL,
  leida           BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_notif_doc FOREIGN KEY (id_documento)
    REFERENCES documentos (id_documento) ON DELETE SET NULL
) ENGINE=InnoDB;
CREATE INDEX IF NOT EXISTS idx_notif_user
  ON notificaciones (id_usuario, leida, creado_en);

-- Consecutivos atómicos de folios por tipo y año. Formato: PREFIJO-AAAA-NNN
-- (ej. CP-2026-001; el prefijo lo pone el back-end según el tipo con PREFIJOS).
-- El back-end usa transacción + SELECT ... FOR UPDATE (siguienteFolio en
-- server/routes/documentos.js) para no duplicar folios.
CREATE TABLE IF NOT EXISTS folios (
  id_tipo       VARCHAR(40) NOT NULL,
  anio          INT NOT NULL,
  ultimo_numero INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id_tipo, anio),
  CONSTRAINT fk_folios_tipo FOREIGN KEY (id_tipo)
    REFERENCES tipos_documento (id_tipo)
) ENGINE=InnoDB;

-- NOTA DE ORDEN: permisos_rol referencia a categorias, así que categorias
-- se creó más arriba, antes que esta tabla.

-- ================= BLOQUE 3: SEEDS =========================================

-- 3.1 Áreas
INSERT INTO areas (id_area, nombre, descripcion) VALUES
  (1, 'Administración', 'Control total del sistema'),
  (2, 'Legal', 'Cartas, notificaciones y avisos'),
  (3, 'Operativa', 'Oficios')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- 3.2 Roles (ids fijos para referenciarlos en permisos y usuarios)
INSERT INTO roles (id_rol, nombre, id_area, descripcion, es_super, puede_gestionar_usuarios) VALUES
  (1, 'Administrador', NULL, 'Control total: todos los documentos y usuarios', TRUE, TRUE),
  (2, 'Legal', 2, 'Ver, crear y modificar cartas, notificaciones y avisos', FALSE, FALSE),
  (3, 'Superusuario Legal', 2, 'Rol Legal + gestiona usuarios de su área', TRUE, TRUE),
  (4, 'Operativo', 3, 'Ver, crear y modificar solo oficios', FALSE, FALSE),
  (5, 'Superusuario Operativo', 3, 'Rol Operativo + gestiona usuarios de su área', TRUE, TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- 3.3 Puestos (catálogo para el select de Usuarios; agrega más si los necesitas)
INSERT INTO puestos (nombre) VALUES
  ('Abogado'),
  ('Analista Legal'),
  ('Auxiliar Administrativo'),
  ('Auxiliar Operativo'),
  ('Contador'),
  ('Director General'),
  ('Gerente'),
  ('Jefe de Departamento'),
  ('Notificador'),
  ('Secretaria')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- 3.4 Categorías (mismos ids que el front)
INSERT INTO categorias (id_categoria, nombre) VALUES
  ('cartas', 'Cartas'),
  ('oficios', 'Oficios'),
  ('avisos', 'Avisos'),
  ('notificaciones', 'Notificaciones Legales')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- 3.4 Permisos por rol y categoría (1 = permitido, 0 = denegado)
-- Admin: todo en todo + gestiona usuarios global.
INSERT INTO permisos_rol
  (id_rol, id_categoria, puede_ver, puede_crear, puede_modificar, puede_eliminar, puede_gestionar_usuarios) VALUES
  (1, 'cartas', 1, 1, 1, 1, 1),
  (1, 'oficios', 1, 1, 1, 1, 1),
  (1, 'avisos', 1, 1, 1, 1, 1),
  (1, 'notificaciones', 1, 1, 1, 1, 1),
  -- Legal base: cartas/avisos/notificaciones (sin oficios, sin gestión)
  (2, 'cartas', 1, 1, 1, 0, 0),
  (2, 'avisos', 1, 1, 1, 0, 0),
  (2, 'notificaciones', 1, 1, 1, 0, 0),
  (2, 'oficios', 0, 0, 0, 0, 0),
  -- Superusuario Legal: igual + gestiona usuarios de SU área
  (3, 'cartas', 1, 1, 1, 0, 1),
  (3, 'avisos', 1, 1, 1, 0, 1),
  (3, 'notificaciones', 1, 1, 1, 0, 1),
  (3, 'oficios', 0, 0, 0, 0, 0),
  -- Operativo base: solo oficios
  (4, 'oficios', 1, 1, 1, 0, 0),
  (4, 'cartas', 0, 0, 0, 0, 0),
  (4, 'avisos', 0, 0, 0, 0, 0),
  (4, 'notificaciones', 0, 0, 0, 0, 0),
  -- Superusuario Operativo: oficios + gestiona usuarios de SU área
  (5, 'oficios', 1, 1, 1, 0, 1),
  (5, 'cartas', 0, 0, 0, 0, 0),
  (5, 'avisos', 0, 0, 0, 0, 0),
  (5, 'notificaciones', 0, 0, 0, 0, 0)
ON DUPLICATE KEY UPDATE
  puede_ver = VALUES(puede_ver),
  puede_crear = VALUES(puede_crear),
  puede_modificar = VALUES(puede_modificar),
  puede_eliminar = VALUES(puede_eliminar),
  puede_gestionar_usuarios = VALUES(puede_gestionar_usuarios);

-- 3.5 Tipos de documento (mismos ids que el front)
INSERT INTO tipos_documento (id_tipo, id_categoria, nombre) VALUES
  ('carta-poder', 'cartas', 'Carta Poder'),
  ('carta-responsiva', 'cartas', 'Carta Responsiva'),
  ('carta-renuncia', 'cartas', 'Carta de Renuncia'),
  ('carta-intencion', 'cartas', 'Carta de Intención'),
  ('oficio-peticion', 'oficios', 'Oficio de Petición'),
  ('oficio-comision', 'oficios', 'Oficio de Comisión'),
  ('oficio-resolucion', 'oficios', 'Oficio de Resolución'),
  ('aviso-privacidad', 'avisos', 'Aviso de Privacidad'),
  ('aviso-rescision', 'avisos', 'Aviso de Rescisión Laboral'),
  ('aviso-funcionamiento', 'avisos', 'Aviso de Funcionamiento'),
  ('notificacion-general', 'notificaciones', 'Notificación legal general')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- 3.6 Campos por tipo (espejo de tiposDocumentos.js: campo, etiqueta, tipo,
-- requerido 1/0, opciones JSON, filas, ayuda, condición mostrarSi, orden).
-- -- Carta Poder (17)
INSERT INTO campos_tipo
  (id_tipo, campo, etiqueta, tipo_campo, requerido, opciones, filas, ayuda, cond_campo, cond_valor, orden) VALUES
  ('carta-poder', 'otorgante', 'Nombre del otorgante', 'texto', 1, NULL, NULL, 'Ingrese los datos tal como aparecen en la identificación oficial', NULL, NULL, 1),
  ('carta-poder', 'tipoDocOtorgante', 'Tipo de documento de identificación del otorgante', 'seleccion', 1, '["INE", "Pasaporte", "Cartilla militar", "Cédula profesional"]', NULL, NULL, NULL, NULL, 2),
  ('carta-poder', 'idOtorgante', 'Folio / número de identificación del otorgante', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 3),
  ('carta-poder', 'apoderado', 'Nombre del apoderado', 'texto', 1, NULL, NULL, 'Ingrese los datos tal como aparecen en la identificación oficial', NULL, NULL, 4),
  ('carta-poder', 'tipoDocApoderado', 'Tipo de documento de identificación del apoderado', 'seleccion', 1, '["INE", "Pasaporte", "Cartilla militar", "Cédula profesional"]', NULL, NULL, NULL, NULL, 5),
  ('carta-poder', 'idApoderado', 'Folio / número de identificación del apoderado', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 6),
  ('carta-poder', 'facultades', 'Facultades / objeto del poder', 'area', 1, NULL, NULL, NULL, NULL, NULL, 7),
  ('carta-poder', 'limites', 'Límites del poder', 'area', 1, NULL, NULL, NULL, NULL, NULL, 8),
  ('carta-poder', 'testigo1Nombre', 'Nombre completo del testigo 1', 'texto', 1, NULL, NULL, 'Ingrese los datos tal como aparecen en la identificación oficial', NULL, NULL, 9),
  ('carta-poder', 'testigo1TipoDoc', 'Tipo de documento de identificación del testigo 1', 'seleccion', 1, '["INE", "Pasaporte", "Cartilla militar", "Cédula profesional"]', NULL, NULL, NULL, NULL, 10),
  ('carta-poder', 'testigo1Id', 'Folio / número de identificación del testigo 1', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 11),
  ('carta-poder', 'testigo2Nombre', 'Nombre completo del testigo 2', 'texto', 1, NULL, NULL, 'Ingrese los datos tal como aparecen en la identificación oficial', NULL, NULL, 12),
  ('carta-poder', 'testigo2TipoDoc', 'Tipo de documento de identificación del testigo 2', 'seleccion', 1, '["INE", "Pasaporte", "Cartilla militar", "Cédula profesional"]', NULL, NULL, NULL, NULL, 13),
  ('carta-poder', 'testigo2Id', 'Folio / número de identificación del testigo 2', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 14),
  ('carta-poder', 'vigencia', 'Vigencia del poder', 'texto', 0, NULL, NULL, NULL, NULL, NULL, 15),
  ('carta-poder', 'lugar', 'Lugar de firma', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 16),
  ('carta-poder', 'fecha', 'Fecha de firma', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 17)
ON DUPLICATE KEY UPDATE
  etiqueta = VALUES(etiqueta), tipo_campo = VALUES(tipo_campo),
  requerido = VALUES(requerido), opciones = VALUES(opciones),
  filas = VALUES(filas), ayuda = VALUES(ayuda),
  cond_campo = VALUES(cond_campo), cond_valor = VALUES(cond_valor),
  orden = VALUES(orden);

-- -- Carta Responsiva (19)
INSERT INTO campos_tipo
  (id_tipo, campo, etiqueta, tipo_campo, requerido, opciones, filas, ayuda, cond_campo, cond_valor, orden) VALUES
  ('carta-responsiva', 'quienEntrega', 'Nombre de quien entrega', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 1),
  ('carta-responsiva', 'tipoIdEntrega', 'Tipo de identificación de quien entrega', 'seleccion', 1, '["INE", "Pasaporte", "Cartilla militar", "Cédula profesional"]', NULL, NULL, NULL, NULL, 2),
  ('carta-responsiva', 'folioEntrega', 'Folio / número de identificación de quien entrega', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 3),
  ('carta-responsiva', 'puestoEntrega', 'Puesto / área de trabajo de quien entrega', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 4),
  ('carta-responsiva', 'quienRecibe', 'Nombre a quien se entrega', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 5),
  ('carta-responsiva', 'tipoIdRecibe', 'Tipo de identificación de quien recibe', 'seleccion', 1, '["INE", "Pasaporte", "Cartilla militar", "Cédula profesional"]', NULL, NULL, NULL, NULL, 6),
  ('carta-responsiva', 'folioRecibe', 'Folio / número de identificación de quien recibe', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 7),
  ('carta-responsiva', 'tipoBien', 'Tipo de bien', 'seleccion', 1, '["Vehículo", "Equipo de cómputo"]', NULL, NULL, NULL, NULL, 8),
  ('carta-responsiva', 'descripcion', 'Descripción del bien', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 9),
  ('carta-responsiva', 'marca', 'Marca', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 10),
  ('carta-responsiva', 'modelo', 'Modelo', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 11),
  ('carta-responsiva', 'noSerie', 'No. de serie', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 12),
  ('carta-responsiva', 'estadoFisico', 'Estado físico', 'seleccion', 1, '["Bueno", "Usado", "Con detalles"]', NULL, NULL, NULL, NULL, 13),
  ('carta-responsiva', 'especifiqueDetalles', 'Especifique detalles', 'texto', 1, NULL, NULL, NULL, 'estadoFisico', 'Con detalles', 14),
  ('carta-responsiva', 'valorEstimado', 'Valor estimado', 'moneda', 1, NULL, NULL, NULL, NULL, NULL, 15),
  ('carta-responsiva', 'fotos', 'Fotos de las condiciones del equipo', 'fotos', 1, NULL, NULL, NULL, NULL, NULL, 16),
  ('carta-responsiva', 'condiciones', 'Condiciones de uso y resguardo', 'area', 1, NULL, NULL, NULL, NULL, NULL, 17),
  ('carta-responsiva', 'lugar', 'Lugar de préstamo', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 18),
  ('carta-responsiva', 'fecha', 'Fecha', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 19)
ON DUPLICATE KEY UPDATE
  etiqueta = VALUES(etiqueta), tipo_campo = VALUES(tipo_campo),
  requerido = VALUES(requerido), opciones = VALUES(opciones),
  filas = VALUES(filas), ayuda = VALUES(ayuda),
  cond_campo = VALUES(cond_campo), cond_valor = VALUES(cond_valor),
  orden = VALUES(orden);

-- -- Carta de Renuncia (9)
INSERT INTO campos_tipo
  (id_tipo, campo, etiqueta, tipo_campo, requerido, opciones, filas, ayuda, cond_campo, cond_valor, orden) VALUES
  ('carta-renuncia', 'empleado', 'Nombre del empleado', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 1),
  ('carta-renuncia', 'numeroEmpleado', 'Número de empleado', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 2),
  ('carta-renuncia', 'puesto', 'Puesto desempeñado', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 3),
  ('carta-renuncia', 'empresa', 'Empresa', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 4),
  ('carta-renuncia', 'ultimoDia', 'Último día laborable', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 5),
  ('carta-renuncia', 'motivo', 'Motivo de la renuncia', 'seleccion', 1, '["Motivos personales", "Crecimiento profesional", "Otro"]', NULL, NULL, NULL, NULL, 6),
  ('carta-renuncia', 'especifiqueMotivo', 'Especifique el motivo', 'texto', 1, NULL, NULL, NULL, 'motivo', 'Otro', 7),
  ('carta-renuncia', 'lugar', 'Lugar', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 8),
  ('carta-renuncia', 'fecha', 'Fecha de la carta', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 9)
ON DUPLICATE KEY UPDATE
  etiqueta = VALUES(etiqueta), tipo_campo = VALUES(tipo_campo),
  requerido = VALUES(requerido), opciones = VALUES(opciones),
  filas = VALUES(filas), ayuda = VALUES(ayuda),
  cond_campo = VALUES(cond_campo), cond_valor = VALUES(cond_valor),
  orden = VALUES(orden);

-- -- Carta de Intención (14)
INSERT INTO campos_tipo
  (id_tipo, campo, etiqueta, tipo_campo, requerido, opciones, filas, ayuda, cond_campo, cond_valor, orden) VALUES
  ('carta-intencion', 'emisoraNombre', 'Nombre de la parte emisora (o Razón Social)', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 1),
  ('carta-intencion', 'emisoraTipoId', 'Tipo de identificación o RFC de la emisora', 'seleccion', 1, '["INE", "Pasaporte", "Cartilla militar", "Cédula profesional", "RFC"]', NULL, NULL, NULL, NULL, 2),
  ('carta-intencion', 'emisoraFolio', 'Folio / número de identificación de la emisora', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 3),
  ('carta-intencion', 'emisoraRepresentante', 'Nombre del representante legal (emisora, opcional)', 'texto', 0, NULL, NULL, NULL, NULL, NULL, 4),
  ('carta-intencion', 'receptoraNombre', 'Nombre de la parte receptora (o Razón Social)', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 5),
  ('carta-intencion', 'receptoraTipoId', 'Tipo de identificación o RFC de la receptora', 'seleccion', 1, '["INE", "Pasaporte", "Cartilla militar", "Cédula profesional", "RFC"]', NULL, NULL, NULL, NULL, 6),
  ('carta-intencion', 'receptoraFolio', 'Folio / número de identificación de la receptora', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 7),
  ('carta-intencion', 'receptoraRepresentante', 'Nombre del representante legal (receptora, opcional)', 'texto', 0, NULL, NULL, NULL, NULL, NULL, 8),
  ('carta-intencion', 'objeto', 'Objeto / propósito de la intención', 'area', 1, NULL, NULL, NULL, NULL, NULL, 9),
  ('carta-intencion', 'confidencialidad', '¿Incluir cláusula de confidencialidad?', 'check', 0, NULL, NULL, NULL, NULL, NULL, 10),
  ('carta-intencion', 'vinculante', '¿Tiene carácter vinculante?', 'check', 0, NULL, NULL, NULL, NULL, NULL, 11),
  ('carta-intencion', 'vigencia', 'Vigencia de la intención (límite del acuerdo)', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 12),
  ('carta-intencion', 'lugar', 'Lugar de firma', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 13),
  ('carta-intencion', 'fecha', 'Fecha de la carta', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 14)
ON DUPLICATE KEY UPDATE
  etiqueta = VALUES(etiqueta), tipo_campo = VALUES(tipo_campo),
  requerido = VALUES(requerido), opciones = VALUES(opciones),
  filas = VALUES(filas), ayuda = VALUES(ayuda),
  cond_campo = VALUES(cond_campo), cond_valor = VALUES(cond_valor),
  orden = VALUES(orden);

-- -- Aviso de Privacidad (9)
INSERT INTO campos_tipo
  (id_tipo, campo, etiqueta, tipo_campo, requerido, opciones, filas, ayuda, cond_campo, cond_valor, orden) VALUES
  ('aviso-privacidad', 'razonSocial', 'Razón social del responsable', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 1),
  ('aviso-privacidad', 'domicilio', 'Domicilio', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 2),
  ('aviso-privacidad', 'tipoAviso', 'Tipo de aviso', 'seleccion', 1, '["Integral", "Simplificado", "Corto"]', NULL, NULL, NULL, NULL, 3),
  ('aviso-privacidad', 'datosRecabados', 'Datos personales que se recaban', 'area', 1, NULL, 5, NULL, NULL, NULL, 4),
  ('aviso-privacidad', 'finalidad', 'Finalidad del tratamiento', 'area', 1, NULL, 5, NULL, NULL, NULL, 5),
  ('aviso-privacidad', 'transferencia', '¿Se transfieren datos a terceros?', 'switch', 0, NULL, NULL, NULL, NULL, NULL, 6),
  ('aviso-privacidad', 'transferenciaDetalle', '¿A quién y para qué se transfieren?', 'texto', 1, NULL, NULL, NULL, 'transferencia', 'true', 7),
  ('aviso-privacidad', 'contactoArco', 'Contacto para derechos ARCO', 'email', 1, NULL, NULL, NULL, NULL, NULL, 8),
  ('aviso-privacidad', 'fecha', 'Fecha de última actualización', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 9)
ON DUPLICATE KEY UPDATE
  etiqueta = VALUES(etiqueta), tipo_campo = VALUES(tipo_campo),
  requerido = VALUES(requerido), opciones = VALUES(opciones),
  filas = VALUES(filas), ayuda = VALUES(ayuda),
  cond_campo = VALUES(cond_campo), cond_valor = VALUES(cond_valor),
  orden = VALUES(orden);

-- -- Aviso de Rescisión Laboral (10)
INSERT INTO campos_tipo
  (id_tipo, campo, etiqueta, tipo_campo, requerido, opciones, filas, ayuda, cond_campo, cond_valor, orden) VALUES
  ('aviso-rescision', 'trabajador', 'Nombre del trabajador', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 1),
  ('aviso-rescision', 'numeroEmpleado', 'Número de empleado', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 2),
  ('aviso-rescision', 'puesto', 'Puesto', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 3),
  ('aviso-rescision', 'causa', 'Causa de la rescisión (hora, día y circunstancias)', 'area', 1, NULL, 6, NULL, NULL, NULL, 4),
  ('aviso-rescision', 'fundamentoLegal', 'Fundamento legal (Art. 47 LFT)', 'seleccion', 0, '["Fracción I", "Fracción II", "Fracción III", "Fracción IV", "Fracción V", "Fracción VI", "Fracción VII", "Fracción VIII", "Fracción IX", "Fracción X", "Fracción XI", "Fracción XII", "Fracción XIII", "Fracción XIV", "Fracción XIV Bis", "Fracción XV"]', NULL, NULL, NULL, NULL, 5),
  ('aviso-rescision', 'nombreRepresentante', 'Nombre del representante legal / patrón', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 6),
  ('aviso-rescision', 'cargoRepresentante', 'Cargo del representante legal / patrón', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 7),
  ('aviso-rescision', 'lugar', 'Lugar', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 8),
  ('aviso-rescision', 'fechaRescision', 'Fecha de la rescisión', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 9),
  ('aviso-rescision', 'fecha', 'Fecha del aviso', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 10)
ON DUPLICATE KEY UPDATE
  etiqueta = VALUES(etiqueta), tipo_campo = VALUES(tipo_campo),
  requerido = VALUES(requerido), opciones = VALUES(opciones),
  filas = VALUES(filas), ayuda = VALUES(ayuda),
  cond_campo = VALUES(cond_campo), cond_valor = VALUES(cond_valor),
  orden = VALUES(orden);

-- -- Aviso de Funcionamiento (9)
INSERT INTO campos_tipo
  (id_tipo, campo, etiqueta, tipo_campo, requerido, opciones, filas, ayuda, cond_campo, cond_valor, orden) VALUES
  ('aviso-funcionamiento', 'autoridadDestino', 'Autoridad a la que se dirige', 'texto', 1, NULL, NULL, 'Ej. Secretaría de Salud Pública Municipal', NULL, NULL, 1),
  ('aviso-funcionamiento', 'establecimiento', 'Establecimiento / razón social', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 2),
  ('aviso-funcionamiento', 'rfc', 'RFC del establecimiento', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 3),
  ('aviso-funcionamiento', 'giro', 'Giro o actividad', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 4),
  ('aviso-funcionamiento', 'domicilio', 'Domicilio del establecimiento', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 5),
  ('aviso-funcionamiento', 'responsable', 'Responsable sanitario / legal', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 6),
  ('aviso-funcionamiento', 'horario', 'Horario de funcionamiento (días y horas)', 'texto', 0, NULL, NULL, NULL, NULL, NULL, 7),
  ('aviso-funcionamiento', 'fechaApertura', 'Fecha de apertura', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 8),
  ('aviso-funcionamiento', 'fecha', 'Fecha del aviso', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 9)
ON DUPLICATE KEY UPDATE
  etiqueta = VALUES(etiqueta), tipo_campo = VALUES(tipo_campo),
  requerido = VALUES(requerido), opciones = VALUES(opciones),
  filas = VALUES(filas), ayuda = VALUES(ayuda),
  cond_campo = VALUES(cond_campo), cond_valor = VALUES(cond_valor),
  orden = VALUES(orden);

-- -- Oficio de Petición (14)
INSERT INTO campos_tipo
  (id_tipo, campo, etiqueta, tipo_campo, requerido, opciones, filas, ayuda, cond_campo, cond_valor, orden) VALUES
  ('oficio-peticion', 'nombreDestinatario', 'Nombre del destinatario', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 1),
  ('oficio-peticion', 'cargoDestinatario', 'Cargo del destinatario', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 2),
  ('oficio-peticion', 'dependenciaDestinatario', 'Dependencia del destinatario', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 3),
  ('oficio-peticion', 'nombreRemitente', 'Nombre del remitente', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 4),
  ('oficio-peticion', 'cargoRemitente', 'Cargo del remitente', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 5),
  ('oficio-peticion', 'folio', 'Número de oficio', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 6),
  ('oficio-peticion', 'asunto', 'Asunto', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 7),
  ('oficio-peticion', 'peticion', 'Petición solicitada', 'area', 1, NULL, NULL, NULL, NULL, NULL, 8),
  ('oficio-peticion', 'ccp', 'C.c.p', 'check', 0, NULL, NULL, NULL, NULL, NULL, 9),
  ('oficio-peticion', 'ccpDetalle', 'Detalle C.c.p (a quién se envía copia)', 'texto', 1, NULL, NULL, NULL, 'ccp', 'true', 10),
  ('oficio-peticion', 'anexos', 'Anexos', 'anexos', 0, NULL, NULL, NULL, NULL, NULL, 11),
  ('oficio-peticion', 'fundamentarArt8', '¿Fundamentar en el Art. 8 Constitucional?', 'switch', 0, NULL, NULL, NULL, NULL, NULL, 12),
  ('oficio-peticion', 'lugar', 'Lugar', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 13),
  ('oficio-peticion', 'fecha', 'Fecha', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 14)
ON DUPLICATE KEY UPDATE
  etiqueta = VALUES(etiqueta), tipo_campo = VALUES(tipo_campo),
  requerido = VALUES(requerido), opciones = VALUES(opciones),
  filas = VALUES(filas), ayuda = VALUES(ayuda),
  cond_campo = VALUES(cond_campo), cond_valor = VALUES(cond_valor),
  orden = VALUES(orden);

-- -- Oficio de Comisión (14)
INSERT INTO campos_tipo
  (id_tipo, campo, etiqueta, tipo_campo, requerido, opciones, filas, ayuda, cond_campo, cond_valor, orden) VALUES
  ('oficio-comision', 'nombreComisionado', 'Nombre del comisionado', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 1),
  ('oficio-comision', 'cargoComisionado', 'Cargo del comisionado', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 2),
  ('oficio-comision', 'numeroEmpleadoComisionado', 'Número de empleado del comisionado', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 3),
  ('oficio-comision', 'folio', 'Número de oficio', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 4),
  ('oficio-comision', 'destino', 'Destino de la comisión', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 5),
  ('oficio-comision', 'fechaInicio', 'Fecha de inicio', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 6),
  ('oficio-comision', 'fechaFin', 'Fecha de término', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 7),
  ('oficio-comision', 'motivo', 'Motivo de la comisión', 'area', 1, NULL, NULL, NULL, NULL, NULL, 8),
  ('oficio-comision', 'nombreAutoriza', 'Nombre completo de quien comisiona', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 9),
  ('oficio-comision', 'cargoAutoriza', 'Cargo de quien comisiona', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 10),
  ('oficio-comision', 'viaticos', '¿Se otorgan viáticos?', 'check', 0, NULL, NULL, NULL, NULL, NULL, 11),
  ('oficio-comision', 'montoViaticos', 'Monto de viáticos', 'moneda', 1, NULL, NULL, NULL, 'viaticos', 'true', 12),
  ('oficio-comision', 'lugar', 'Lugar de emisión', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 13),
  ('oficio-comision', 'fecha', 'Fecha de emisión', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 14)
ON DUPLICATE KEY UPDATE
  etiqueta = VALUES(etiqueta), tipo_campo = VALUES(tipo_campo),
  requerido = VALUES(requerido), opciones = VALUES(opciones),
  filas = VALUES(filas), ayuda = VALUES(ayuda),
  cond_campo = VALUES(cond_campo), cond_valor = VALUES(cond_valor),
  orden = VALUES(orden);

-- -- Oficio de Resolución (13)
INSERT INTO campos_tipo
  (id_tipo, campo, etiqueta, tipo_campo, requerido, opciones, filas, ayuda, cond_campo, cond_valor, orden) VALUES
  ('oficio-resolucion', 'nombreDestinatario', 'Nombre del destinatario', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 1),
  ('oficio-resolucion', 'cargoDestinatario', 'Cargo del destinatario', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 2),
  ('oficio-resolucion', 'folio', 'Número de resolución', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 3),
  ('oficio-resolucion', 'referenciaOrigen', 'Oficio o petición de origen', 'texto', 1, NULL, NULL, 'Ej. En respuesta a su solicitud OF-001 de fecha...', NULL, NULL, 4),
  ('oficio-resolucion', 'interesado', 'Interesado / promovente', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 5),
  ('oficio-resolucion', 'asunto', 'Asunto', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 6),
  ('oficio-resolucion', 'sentido', 'Sentido de la resolución', 'seleccion', 1, '["Favorable", "No favorable", "Parcialmente favorable"]', NULL, NULL, NULL, NULL, 7),
  ('oficio-resolucion', 'considerandos', 'Considerandos / fundamentos', 'area', 1, NULL, 5, NULL, NULL, NULL, 8),
  ('oficio-resolucion', 'puntosResolutivos', 'Puntos resolutivos', 'area', 1, NULL, 5, 'Ej. PRIMERO: Se autoriza el pago. SEGUNDO: Archívese el expediente.', NULL, NULL, 9),
  ('oficio-resolucion', 'nombreResuelve', 'Nombre de quien resuelve', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 10),
  ('oficio-resolucion', 'cargoResuelve', 'Cargo de quien resuelve', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 11),
  ('oficio-resolucion', 'lugar', 'Lugar', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 12),
  ('oficio-resolucion', 'fecha', 'Fecha', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 13)
ON DUPLICATE KEY UPDATE
  etiqueta = VALUES(etiqueta), tipo_campo = VALUES(tipo_campo),
  requerido = VALUES(requerido), opciones = VALUES(opciones),
  filas = VALUES(filas), ayuda = VALUES(ayuda),
  cond_campo = VALUES(cond_campo), cond_valor = VALUES(cond_valor),
  orden = VALUES(orden);

-- -- Notificación legal general (9)
INSERT INTO campos_tipo
  (id_tipo, campo, etiqueta, tipo_campo, requerido, opciones, filas, ayuda, cond_campo, cond_valor, orden) VALUES
  ('notificacion-general', 'destinatario', 'Destinatario', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 1),
  ('notificacion-general', 'domicilio', 'Domicilio para notificar', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 2),
  ('notificacion-general', 'expediente', 'Expediente / referencia', 'texto', 0, NULL, NULL, NULL, NULL, NULL, 3),
  ('notificacion-general', 'nombreNotifica', 'Nombre de quien notifica', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 4),
  ('notificacion-general', 'cargoNotifica', 'Cargo / Área de quien notifica', 'texto', 1, NULL, NULL, 'Ej. Departamento de Cobranza o Dirección General', NULL, NULL, 5),
  ('notificacion-general', 'extracto', 'Extracto de lo que se notifica', 'area', 1, NULL, 6, NULL, NULL, NULL, 6),
  ('notificacion-general', 'acuseRecibo', '¿Incluir acuse de recibo?', 'switch', 0, NULL, NULL, 'Genera bloque final con líneas para Nombre, Firma, Fecha y Hora de recepción', NULL, NULL, 7),
  ('notificacion-general', 'lugar', 'Lugar', 'texto', 1, NULL, NULL, NULL, NULL, NULL, 8),
  ('notificacion-general', 'fecha', 'Fecha', 'fecha', 1, NULL, NULL, NULL, NULL, NULL, 9)
ON DUPLICATE KEY UPDATE
  etiqueta = VALUES(etiqueta), tipo_campo = VALUES(tipo_campo),
  requerido = VALUES(requerido), opciones = VALUES(opciones),
  filas = VALUES(filas), ayuda = VALUES(ayuda),
  cond_campo = VALUES(cond_campo), cond_valor = VALUES(cond_valor),
  orden = VALUES(orden);

-- 3.7 Usuario administrador inicial.
-- IMPORTANTE: 'PENDIENTE_HASH_BCRYPT' es un marcador. El back-end debe
-- generarlo con bcrypt/argon2 (p. ej. para Admin123*) y hacer UPDATE.
-- Jamás guardes contraseñas en claro.
INSERT INTO usuarios (nombre, correo, hash_contrasena, id_rol, id_area) VALUES
  ('Administrador', 'admin@sislegal.mx', 'PENDIENTE_HASH_BCRYPT', 1, 1)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- 3.8 Cliente de ejemplo (bórralo o edítalo cuando cargues los reales).
INSERT INTO clientes (tipo_cliente, nombre, rfc, domicilio, correo) VALUES
  ('moral', 'EJEMPLO - Acme S.A. de C.V.', 'ACM010101AAA', 'Av. Ejemplo 123, CDMX', 'contacto@ejemplo.mx')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- ================= BLOQUE 4: VERIFICACIÓN ==================================
-- Ejecuta estas consultas en DBeaver para confirmar que todo quedó cargado.
-- SELECT COUNT(*) AS tipos FROM tipos_documento;            -- esperado: 11
-- SELECT COUNT(*) AS campos FROM campos_tipo;               -- esperado: 137
-- SELECT * FROM permisos_rol ORDER BY id_rol, id_categoria; -- esperado: 20 filas
-- SELECT COUNT(*) AS puestos FROM puestos;               -- esperado: 10
-- SELECT u.nombre, u.correo, r.nombre AS rol, a.nombre AS area
--   FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
--   JOIN areas a ON a.id_area = u.id_area;

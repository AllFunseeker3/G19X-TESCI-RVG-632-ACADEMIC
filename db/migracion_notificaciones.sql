-- Migración NOTIF-01: campanita de avisos (creación de documentos).
-- Idempotente (IF NOT EXISTS). La app inserta una fila por destinatario
-- (supers del área + admins) en POST /api/documentos.
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

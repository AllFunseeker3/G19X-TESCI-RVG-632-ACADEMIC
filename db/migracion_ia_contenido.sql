-- Migración IA-01: guarda el texto redactado por la IA en documentos.
-- Idempotente (IF NOT EXISTS).
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS contenido MEDIUMTEXT NULL AFTER datos;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS modelo_ia VARCHAR(120) NULL AFTER contenido;

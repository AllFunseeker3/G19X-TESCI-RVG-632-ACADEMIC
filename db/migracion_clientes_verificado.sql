-- Migración CLI-01: verificación de clientes (altas de no-privilegiados pendientes).
-- Idempotente (IF NOT EXISTS / UPDATE directo).
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS verificado BOOLEAN NOT NULL DEFAULT FALSE AFTER activo;
-- Los preexistentes (semilla del sistema) se consideran verificados.
UPDATE clientes SET verificado = TRUE WHERE verificado = FALSE;

-- Migración LIM-01: limpieza de objetos sin uso (2026-10-14).
-- Idempotente. Ya consolidada en maestro.sql.
-- 1) auditoria: tabla creada pero jamás leída ni escrita (trazabilidad real en documento_historial).
-- 2) clientes.contacto: columna quitada del form (§60), siempre NULL desde UI.
DROP TABLE IF EXISTS auditoria;
ALTER TABLE clientes DROP COLUMN IF EXISTS contacto;

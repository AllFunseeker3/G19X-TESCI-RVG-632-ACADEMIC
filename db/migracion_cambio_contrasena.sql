-- Migración CC-01: cambio obligatorio de contraseña en el primer ingreso.
-- Agrega el flag a usuarios (idempotente). Los usuarios existentes/seed quedan
-- en FALSE (ya conocen su contraseña); las altas nuevas lo marcan TRUE y tanto
-- el login como la API obligan a cambiarla (403 CAMBIO_CONTRASENA_REQUERIDO).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS debe_cambiar_contrasena BOOLEAN NOT NULL DEFAULT FALSE AFTER hash_contrasena;

-- Migración ADJ-01: versionado de PDFs (vigente vs versiones anteriores).
-- Idempotente (IF NOT EXISTS / UPDATE directo).
ALTER TABLE adjuntos ADD COLUMN IF NOT EXISTS vigente BOOLEAN NOT NULL DEFAULT TRUE AFTER ruta;
-- Backfill: por documento, solo el adjunto más reciente queda vigente.
UPDATE adjuntos a
JOIN (SELECT id_documento, MAX(id_adjunto) AS m FROM adjuntos GROUP BY id_documento) m
  ON m.id_documento = a.id_documento
SET a.vigente = (a.id_adjunto = m.m);
CREATE INDEX IF NOT EXISTS idx_adj_doc_vig ON adjuntos (id_documento, vigente);

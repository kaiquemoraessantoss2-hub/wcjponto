-- OPCIONAL: permitir múltiplos responsáveis por obra (N:N).
-- Roda no SQL Editor do Supabase se quiser várias pessoas responsáveis pela mesma obra.
-- Por padrão a tabela tem unique(obra_id), que limita a 1 responsável por obra.

ALTER TABLE obra_responsaveis
  DROP CONSTRAINT IF EXISTS obra_responsaveis_obra_id_key;

ALTER TABLE obra_responsaveis
  ADD CONSTRAINT obra_responsaveis_obra_funcionario_unique
  UNIQUE (obra_id, funcionario_id);

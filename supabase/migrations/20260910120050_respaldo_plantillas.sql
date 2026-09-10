-- =====================================================================
-- RESPALDO DE LA PLANTILLA LEGAL  ·  EJECUTAR ANTES QUE NADA
-- Solo existe UNA plantilla real (Inversiones Ingeniería GC, 6 cláusulas).
-- El Editor de Plantillas de la app la destruye en cuanto alguien
-- pulsa "Guardar": arranca con 2 cláusulas de ejemplo y hace upsert.
-- Esto la copia a una tabla aparte, fuera del alcance del editor.
-- =====================================================================

create table if not exists public.plantillas_respaldo (
  id            uuid primary key default gen_random_uuid(),
  origen_id     uuid,
  empresa_id    uuid,
  tipo_contrato varchar,
  titulo        text,
  clausulas     jsonb,
  respaldado_el timestamptz not null default now(),
  nota          text
);

insert into public.plantillas_respaldo
  (origen_id, empresa_id, tipo_contrato, titulo, clausulas, nota)
select id, empresa_id, tipo_contrato, titulo_documento, clausulas::jsonb,
       'Respaldo previo a la auditoría'
from public.plantillas_contratos;

-- Confirmar
select empresa_id, tipo_contrato, titulo,
       jsonb_array_length(clausulas) as clausulas,
       respaldado_el
from public.plantillas_respaldo;

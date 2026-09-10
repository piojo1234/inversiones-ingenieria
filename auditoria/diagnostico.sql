-- =====================================================================
-- DIAGNÓSTICO INVERSIONES ING  ·  ejecutar en Supabase > SQL Editor
-- Pega el resultado de cada bloque. Todo es SOLO LECTURA.
-- =====================================================================

-- 1. ¿Están las 3 empresas y sus proyectos?
select e.id, e.nombre, e.nit,
       (select count(*) from proyectos p where p.empresa_id = e.id) as proyectos,
       (select count(*) from inmuebles i
          join proyectos p on p.id = i.proyecto_id
         where p.empresa_id = e.id) as inmuebles
from empresas e
order by e.nombre;

-- 2. Lotes huérfanos: no salen en Inventario porque no cuelgan de un proyecto
select count(*) as inmuebles_sin_proyecto from inmuebles where proyecto_id is null;

select count(*) as proyectos_sin_empresa from proyectos where empresa_id is null;

-- 3. Lotes que rompen la vista de Inventario (campos NULL que el código no tolera)
select count(*) filter (where estado is null)       as sin_estado,
       count(*) filter (where precio_venta is null) as sin_precio,
       count(*) filter (where area_m2 is null)      as sin_area
from inmuebles;

-- 4. Estados de inmueble realmente usados (el código solo pinta 4)
select estado, count(*) from inmuebles group by estado order by 2 desc;

-- 5. Plantillas: ¿tienen cláusulas reales o quedaron las 2 de ejemplo?
select id, empresa_id, tipo_contrato, titulo_documento,
       jsonb_array_length(clausulas::jsonb) as num_clausulas,
       left(clausulas::text, 300)           as muestra,
       updated_at
from plantillas_contratos
order by empresa_id, tipo_contrato;

-- 6. Variables {{...}} usadas en las plantillas (las que no reconoce el código se BORRAN)
select distinct m[1] as variable
from plantillas_contratos,
     lateral regexp_matches(clausulas::text, '\{\{([^}]+)\}\}', 'g') m
order by 1;

-- 7. Contratos: cuántos quedaron sin la estructura de pago guardada
select count(*)                                                as total,
       count(*) filter (where monto_cuota_inicial is null
                          and valor_cuota_inicial is null)      as sin_cuota_inicial,
       count(*) filter (where numero_cuotas_ordinarias is null
                          and num_cuotas_ordinarias is null)    as sin_num_cuotas,
       count(*) filter (where fecha_fin is null)                as sin_fecha_fin,
       count(*) filter (where inmueble_id is null)              as sin_inmueble
from contratos;

-- 8. Inconsistencia de mayúsculas en estado_firma
select estado_firma, count(*) from contratos group by estado_firma;

-- 9. Contratos sin plan de pagos (se cayó el insert después de crear el contrato)
select count(*) as contratos_sin_plan
from contratos c
where not exists (select 1 from plan_pagos pp where pp.contrato_id = c.id);

-- 10. Contratos sin contratantes
select count(*) as contratos_sin_contratantes
from contratos c
where not exists (select 1 from contratantes_contrato cc where cc.contrato_id = c.id);

-- 11. Cartera: cuotas vencidas que siguen marcadas 'Pendiente'
select count(*)                                                     as cuotas_totales,
       count(*) filter (where estado = 'Pendiente'
                          and fecha_vencimiento < current_date)      as vencidas_mal_marcadas,
       count(*) filter (where coalesce(monto_interes_mora,0) > 0)    as con_mora_calculada,
       count(*) filter (where coalesce(monto_pagado,0) > 0
                          and coalesce(monto_pagado,0) < monto_cuota) as abonos_parciales
from plan_pagos;

-- 12. Doble venta: inmuebles con más de un contrato vivo
select i.identificador, count(*) as contratos
from contratos c join inmuebles i on i.id = c.inmueble_id
where coalesce(c.estado_firma,'') not in ('Cancelado')
group by i.identificador having count(*) > 1;

-- 13. Inmuebles vendidos/contratados que siguen 'Disponible'
select count(*) as disponibles_con_contrato
from inmuebles i
where i.estado = 'Disponible'
  and exists (select 1 from contratos c where c.inmueble_id = i.id);

-- 14. Clientes duplicados por documento
select documento, count(*) from clientes group by documento having count(*) > 1;

-- 15. SEGURIDAD: ¿qué tablas tienen RLS activo?
select relname as tabla, relrowsecurity as rls_activo,
       (select count(*) from pg_policies p
         where p.schemaname='public' and p.tablename = c.relname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by relrowsecurity, relname;

-- 16. Perfiles y a qué empresas están vinculados
select p.nombre, p.rol, count(pe.empresa_id) as empresas
from perfiles p
left join perfiles_empresas pe on pe.perfil_id = p.id
group by p.id, p.nombre, p.rol;

-- 17. Columnas reales de 'contratos' (para confirmar los duplicados)
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema='public' and table_name='contratos'
order by ordinal_position;

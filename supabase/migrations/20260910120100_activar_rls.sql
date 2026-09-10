-- =====================================================================
-- Activar seguridad a nivel de fila (RLS) en las 13 tablas
--
-- Antes de esta migración las tablas estaban completamente abiertas: la
-- clave anónima viaja en el JavaScript del navegador, así que cualquiera
-- podía leer y escribir clientes, contratos y cartera de las tres
-- empresas sin iniciar sesión.
--
-- EFECTO CONOCIDO: la página pública /firmar/{id} deja de funcionar, a
-- propósito. Hoy es un hueco de seguridad (enlace sin token, sin
-- verificación de identidad, y una sola persona puede firmar por todas).
-- Se restablece en la Fase 4 con una ruta de servidor y enlace con token.
--
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------
-- Función auxiliar: empresas a las que pertenece quien consulta
-- ---------------------------------------------------------------
create or replace function public.empresas_del_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id
  from perfiles_empresas
  where perfil_id = auth.uid()
$$;

comment on function public.empresas_del_usuario() is
  'Empresas vinculadas al usuario autenticado. security definer para poder '
  'leer perfiles_empresas con RLS activo. Base de todas las políticas.';

revoke all on function public.empresas_del_usuario() from public, anon;
grant execute on function public.empresas_del_usuario() to authenticated;

-- ---------------------------------------------------------------
-- Activar RLS
-- ---------------------------------------------------------------
alter table public.perfiles              enable row level security;
alter table public.perfiles_empresas     enable row level security;
alter table public.empresas              enable row level security;
alter table public.proyectos             enable row level security;
alter table public.inmuebles             enable row level security;
alter table public.clientes              enable row level security;
alter table public.plantillas_contratos  enable row level security;
alter table public.contratos             enable row level security;
alter table public.contratantes_contrato enable row level security;
alter table public.plan_pagos            enable row level security;
alter table public.pagos_bitacora        enable row level security;
alter table public.gestion_cartera       enable row level security;
alter table public.proyecciones_recaudo  enable row level security;

-- ---------------------------------------------------------------
-- Identidad
-- ---------------------------------------------------------------
drop policy if exists "perfil propio" on public.perfiles;
create policy "perfil propio" on public.perfiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists "vinculos propios" on public.perfiles_empresas;
create policy "vinculos propios" on public.perfiles_empresas
  for select to authenticated
  using (perfil_id = auth.uid());

drop policy if exists "empresas asignadas" on public.empresas;
create policy "empresas asignadas" on public.empresas
  for select to authenticated
  using (id in (select empresas_del_usuario()));

-- ---------------------------------------------------------------
-- Inventario
-- ---------------------------------------------------------------
drop policy if exists "proyectos de mis empresas" on public.proyectos;
create policy "proyectos de mis empresas" on public.proyectos
  for all to authenticated
  using      (empresa_id in (select empresas_del_usuario()))
  with check (empresa_id in (select empresas_del_usuario()));

drop policy if exists "inmuebles de mis empresas" on public.inmuebles;
create policy "inmuebles de mis empresas" on public.inmuebles
  for all to authenticated
  using (exists (
    select 1 from proyectos p
    where p.id = inmuebles.proyecto_id
      and p.empresa_id in (select empresas_del_usuario())))
  with check (exists (
    select 1 from proyectos p
    where p.id = inmuebles.proyecto_id
      and p.empresa_id in (select empresas_del_usuario())));

-- ---------------------------------------------------------------
-- Contratos y plantillas
-- ---------------------------------------------------------------
drop policy if exists "plantillas de mis empresas" on public.plantillas_contratos;
create policy "plantillas de mis empresas" on public.plantillas_contratos
  for all to authenticated
  using      (empresa_id in (select empresas_del_usuario()))
  with check (empresa_id in (select empresas_del_usuario()));

drop policy if exists "contratos de mis empresas" on public.contratos;
create policy "contratos de mis empresas" on public.contratos
  for all to authenticated
  using      (empresa_id in (select empresas_del_usuario()))
  with check (empresa_id in (select empresas_del_usuario()));

drop policy if exists "contratantes de mis contratos" on public.contratantes_contrato;
create policy "contratantes de mis contratos" on public.contratantes_contrato
  for all to authenticated
  using (exists (
    select 1 from contratos c
    where c.id = contratantes_contrato.contrato_id
      and c.empresa_id in (select empresas_del_usuario())))
  with check (exists (
    select 1 from contratos c
    where c.id = contratantes_contrato.contrato_id
      and c.empresa_id in (select empresas_del_usuario())));

-- ---------------------------------------------------------------
-- Cartera
-- ---------------------------------------------------------------
drop policy if exists "plan de pagos de mis contratos" on public.plan_pagos;
create policy "plan de pagos de mis contratos" on public.plan_pagos
  for all to authenticated
  using (exists (
    select 1 from contratos c
    where c.id = plan_pagos.contrato_id
      and c.empresa_id in (select empresas_del_usuario())))
  with check (exists (
    select 1 from contratos c
    where c.id = plan_pagos.contrato_id
      and c.empresa_id in (select empresas_del_usuario())));

drop policy if exists "pagos de mis contratos" on public.pagos_bitacora;
create policy "pagos de mis contratos" on public.pagos_bitacora
  for all to authenticated
  using (exists (
    select 1 from plan_pagos pp
    join contratos c on c.id = pp.contrato_id
    where pp.id = pagos_bitacora.plan_pagos_id
      and c.empresa_id in (select empresas_del_usuario())))
  with check (exists (
    select 1 from plan_pagos pp
    join contratos c on c.id = pp.contrato_id
    where pp.id = pagos_bitacora.plan_pagos_id
      and c.empresa_id in (select empresas_del_usuario())));

drop policy if exists "gestion de mis contratos" on public.gestion_cartera;
create policy "gestion de mis contratos" on public.gestion_cartera
  for all to authenticated
  using (exists (
    select 1 from contratos c
    where c.id = gestion_cartera.contrato_id
      and c.empresa_id in (select empresas_del_usuario())))
  with check (exists (
    select 1 from contratos c
    where c.id = gestion_cartera.contrato_id
      and c.empresa_id in (select empresas_del_usuario())));

drop policy if exists "proyecciones de mis empresas" on public.proyecciones_recaudo;
create policy "proyecciones de mis empresas" on public.proyecciones_recaudo
  for all to authenticated
  using      (empresa_id in (select empresas_del_usuario()))
  with check (empresa_id in (select empresas_del_usuario()));

-- ---------------------------------------------------------------
-- Clientes · PROVISIONAL
-- La tabla no tiene empresa_id, así que por ahora solo se puede exigir
-- sesión iniciada. Al crear la relación cliente–empresa (Fase 1) esta
-- política se reemplaza por una equivalente a las de arriba.
-- ---------------------------------------------------------------
drop policy if exists "clientes solo con sesion" on public.clientes;
create policy "clientes solo con sesion" on public.clientes
  for all to authenticated
  using (true)
  with check (true);

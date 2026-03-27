-- Tablero Embajadores GLOBA — Schema v2 (Supabase Auth)
-- Correr en: Supabase > SQL Editor

-- Limpiar schema anterior
drop table if exists referidos;
drop table if exists embajadores;

-- 1. Función auxiliar para chequear admin sin recursión
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from embajadores where user_id = auth.uid() and es_admin = true
  );
$$;

-- 2. Tabla embajadores
create table embajadores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  nombre text not null,
  es_admin boolean not null default false,
  created_at timestamptz default now()
);

-- 3. Tabla referidos
create table referidos (
  id uuid default gen_random_uuid() primary key,
  embajador_id uuid references embajadores(id) on delete cascade not null,
  nombre_referido text not null,
  destino text,
  estado text not null default 'Contactado'
    check (estado in ('Contactado', 'En asesoramiento', 'Cotizado', 'Confirmado', 'No concretado')),
  cashback_monto numeric not null default 0,
  cashback_inicio date,
  fecha_cierre date,
  created_at timestamptz default now()
);

-- 4. Row Level Security
alter table embajadores enable row level security;
alter table referidos enable row level security;

-- Policies: embajadores
create policy "ver propio embajador o admin" on embajadores
  for select using (user_id = auth.uid() or is_admin());

create policy "admin inserta embajadores" on embajadores
  for insert with check (is_admin());

create policy "admin actualiza embajadores" on embajadores
  for update using (is_admin());

-- Policies: referidos
create policy "embajador ve sus referidos" on referidos
  for select using (
    embajador_id in (select id from embajadores where user_id = auth.uid())
    or is_admin()
  );

create policy "admin inserta referidos" on referidos
  for insert with check (is_admin());

create policy "admin actualiza referidos" on referidos
  for update using (is_admin());

-- ============================================================
-- PASO FINAL: Después de crear a Sol en Supabase Auth,
-- reemplazá su email y ejecutá esto:
-- ============================================================
-- insert into embajadores (user_id, nombre, es_admin)
-- values (
--   (select id from auth.users where email = 'REEMPLAZAR_CON_EMAIL_DE_SOL'),
--   'Sol',
--   true
-- );

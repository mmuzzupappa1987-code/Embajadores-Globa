-- Tablero Embajadores GLOBA — Schema
-- Correr en: Supabase > SQL Editor

-- 1. Tabla embajadores
create table embajadores (
  id uuid default gen_random_uuid() primary key,
  nombre text not null unique,
  created_at timestamptz default now()
);

-- 2. Tabla referidos
create table referidos (
  id uuid default gen_random_uuid() primary key,
  embajador_id uuid references embajadores(id) on delete cascade not null,
  nombre_referido text not null,
  estado text not null default 'activo' check (estado in ('activo', 'cerrado')),
  cashback_monto numeric not null default 0,
  cashback_inicio date,          -- fecha inicio de vigencia (365 dias desde aca)
  fecha_cierre date,
  created_at timestamptz default now()
);

-- 3. Row Level Security (RLS)
alter table embajadores enable row level security;
alter table referidos enable row level security;

-- Politicas: acceso publico con anon key (suficiente para esta app sin auth real)
create policy "read embajadores" on embajadores for select using (true);
create policy "insert embajadores" on embajadores for insert with check (true);
create policy "update embajadores" on embajadores for update using (true);

create policy "read referidos" on referidos for select using (true);
create policy "insert referidos" on referidos for insert with check (true);
create policy "update referidos" on referidos for update using (true);

-- 4. Insertar a Sol como admin por defecto
insert into embajadores (nombre) values ('Sol');

-- 012_appointments_and_restock.sql
-- เพิ่ม 2 ฟีเจอร์ใหม่: นัดหมาย (appointments) และ ของรอเพย์เดย์ (restock_items)

-- ───────────── 1. ตาราง people (คนในบ้านทั้งเด็กและผู้ใหญ่) ─────────────
create table if not exists public.people (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  name        text not null,
  avatar      text not null default '🧒',
  kind        text not null check (kind in ('child', 'adult')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_people_family_id on public.people (family_id);

alter table public.people enable row level security;
create policy "Allow service_role full access on people"
  on public.people for all to service_role using (true) with check (true);

-- ───────────── 2. ตาราง appointments (นัดหมาย) ─────────────
create table if not exists public.appointments (
  id                    uuid primary key default gen_random_uuid(),
  family_id             uuid not null references public.families(id) on delete cascade,
  person_id             uuid not null references public.people(id) on delete cascade,
  title                 text not null,
  category              text,
  appointment_at        timestamptz not null,
  location              text,
  note                  text,
  remind_before_hours   int,
  status                text not null check (status in ('upcoming', 'done', 'cancelled')) default 'upcoming',
  reminded_at           timestamptz,
  created_at            timestamptz not null default now()
);

create index if not exists idx_appointments_family_time
  on public.appointments (family_id, appointment_at);

create index if not exists idx_appointments_status_time
  on public.appointments (status, appointment_at);

alter table public.appointments enable row level security;
create policy "Allow service_role full access on appointments"
  on public.appointments for all to service_role using (true) with check (true);

-- ───────────── 3. ตาราง restock_items (ของรอเพย์เดย์) ─────────────
create table if not exists public.restock_items (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  name        text not null,
  link        text,
  note        text,
  added_at    timestamptz not null default now(),
  bought_at   timestamptz
);

create index if not exists idx_restock_items_family_added
  on public.restock_items (family_id, added_at desc);

create index if not exists idx_restock_items_bought_at
  on public.restock_items (family_id, bought_at);

alter table public.restock_items enable row level security;
create policy "Allow service_role full access on restock_items"
  on public.restock_items for all to service_role using (true) with check (true);

-- ───────────── 4. ตาราง restock_reminder_log (กันเตือนเพย์เดย์ซ้ำในเดือนเดียวกัน) ─────────────
create table if not exists public.restock_reminder_log (
  family_id   uuid not null references public.families(id) on delete cascade,
  ym          text not null, -- เช่น '2026-09'
  sent_at     timestamptz not null default now(),
  primary key (family_id, ym)
);

alter table public.restock_reminder_log enable row level security;
create policy "Allow service_role full access on restock_reminder_log"
  on public.restock_reminder_log for all to service_role using (true) with check (true);

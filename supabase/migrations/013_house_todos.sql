-- 013_house_todos.sql
-- เพิ่มฟีเจอร์: โน้ตและสิ่งที่ต้องทำในบ้าน (House Todos)

create table if not exists public.house_todos (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  person_id     uuid references public.people(id) on delete set null,
  title         text not null,
  note          text,
  category      text,
  priority      text not null check (priority in ('low', 'normal', 'high', 'urgent')) default 'normal',
  due_date      date,
  status        text not null check (status in ('pending', 'done')) default 'pending',
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_house_todos_family_status
  on public.house_todos (family_id, status);

create index if not exists idx_house_todos_family_created
  on public.house_todos (family_id, created_at desc);

create index if not exists idx_house_todos_due_date
  on public.house_todos (family_id, due_date);

alter table public.house_todos enable row level security;

create policy "Allow service_role full access on house_todos"
  on public.house_todos for all to service_role using (true) with check (true);

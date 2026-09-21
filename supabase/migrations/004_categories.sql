-- บ้านเราซื้ออะไร — เพิ่มระบบหมวดหมู่สินค้า (4 หมวดเริ่มต้น)
-- รันใน Supabase → SQL Editor

-- 1. สร้างตาราง categories
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  name        text not null,
  icon        text not null default '📦',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists categories_family_id_idx on public.categories (family_id, sort_order);

-- เปิด RLS (สอดคล้องกับตารางอื่นในระบบที่ใช้ Server Actions เข้าถึง)
alter table public.categories enable row level security;

-- 2. เพิ่ม category_id ใน products
alter table public.products
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create index if not exists products_category_id_idx on public.products (category_id);

-- 3. สร้าง 4 หมวดเริ่มต้นให้ทุกครอบครัวที่มีอยู่ในระบบ
insert into public.categories (family_id, name, icon, sort_order)
select f.id, c.name, c.icon, c.sort_order
from public.families f
cross join (
  values
    ('ผัก', '🥬', 1),
    ('ของสด', '🥩', 2),
    ('ผลไม้', '🍎', 3),
    ('อื่นๆ', '📦', 4)
) as c(name, icon, sort_order)
where not exists (
  select 1 from public.categories existing
  where existing.family_id = f.id and existing.name = c.name
);

-- 4. แมปหมวดหมู่ให้กับสินค้าตัวอย่างเดิม
-- หมวดผัก
update public.products p
set category_id = c.id
from public.categories c
where p.family_id = c.family_id
  and c.name = 'ผัก'
  and p.category_id is null
  and p.name in ('ผักกาดขาว', 'กวางตุ้ง', 'มะเขือเทศ', 'ฟักทอง', 'ต้นหอม', 'หน่อไม้ฝรั่ง', 'แตงกวา', 'ข้าวโพดอ่อน', 'มันฝรั่ง');

-- หมวดของสด
update public.products p
set category_id = c.id
from public.categories c
where p.family_id = c.family_id
  and c.name = 'ของสด'
  and p.category_id is null
  and p.name in ('หมูสันใน', 'ปลา', 'กุ้งแชบ๊วย', 'ปีกไก่', 'ตับไก่', 'ไข่');

-- หมวดผลไม้
update public.products p
set category_id = c.id
from public.categories c
where p.family_id = c.family_id
  and c.name = 'ผลไม้'
  and p.category_id is null
  and p.name in ('กล้วย');

-- หมวดอื่นๆ สำหรับสินค้าที่เหลือทั้งหมด
update public.products p
set category_id = c.id
from public.categories c
where p.family_id = c.family_id
  and c.name = 'อื่นๆ'
  and p.category_id is null;

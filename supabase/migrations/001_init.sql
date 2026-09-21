-- บ้านเราซื้ออะไร — schema เริ่มต้น
-- รันใน Supabase → SQL Editor (ทั้งไฟล์ครั้งเดียว)

create extension if not exists pgcrypto;

-- ───────────── ครอบครัวและสมาชิก ─────────────
create table public.families (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  code          text not null unique,          -- รหัสครอบครัว (พิมพ์ตอนเข้าใช้ครั้งแรก)
  pin_hash      text not null,                 -- scrypt (salt:hash) ไม่เก็บ PIN จริง
  realtime_key  text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at    timestamptz not null default now()
);

create table public.family_members (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  name        text not null,
  avatar      text not null default '🙂',
  sort_order  int  not null default 0,
  user_id     uuid,                            -- เผื่อผูก auth.users ในอนาคต
  created_at  timestamptz not null default now()
);
create index on public.family_members (family_id, sort_order);

-- ───────────── สินค้า (Master Data ของครอบครัว) ─────────────
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references public.families(id) on delete cascade,
  name              text not null,
  emoji             text not null default '🛒',
  unit              text not null default 'ชิ้น',
  default_quantity  numeric not null default 1 check (default_quantity > 0),
  default_note      text,
  use_count         int  not null default 0,
  last_ordered_at   timestamptz,
  archived_at       timestamptz,               -- เก็บซ่อนแทนการลบ เพื่อให้ประวัติอ้างอิงได้
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.products (family_id) where archived_at is null;

-- ───────────── รายการสั่งซื้อ ─────────────
create table public.shopping_lists (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references public.families(id) on delete cascade,
  created_by    uuid references public.family_members(id) on delete set null,
  status        text not null default 'active' check (status in ('active', 'done')),
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index on public.shopping_lists (family_id, created_at desc);
-- ครอบครัวหนึ่งมีรายการ "กำลังซื้อ" ได้ใบเดียว
create unique index one_active_list_per_family
  on public.shopping_lists (family_id) where status = 'active';

create table public.shopping_list_items (
  id             uuid primary key default gen_random_uuid(),
  list_id        uuid not null references public.shopping_lists(id) on delete cascade,
  product_id     uuid references public.products(id) on delete set null,
  name_snapshot  text not null,                -- ชื่อ ณ วันที่สั่ง ประวัติไม่เปลี่ยนตามชื่อสินค้า
  emoji          text not null default '🛒',
  quantity       numeric not null check (quantity > 0),
  unit           text not null,
  note           text,
  is_purchased   boolean not null default false,
  purchased_at   timestamptz,
  added_by       uuid references public.family_members(id) on delete set null,
  created_at     timestamptz not null default clock_timestamp()
);
create index on public.shopping_list_items (list_id, created_at);

-- ───────────── ความปลอดภัย ─────────────
-- เปิด RLS และไม่สร้าง policy = anon key อ่าน/เขียนตารางไม่ได้เลย
-- แอปเข้าถึงข้อมูลผ่าน Server Actions ด้วย service role เท่านั้น
alter table public.families            enable row level security;
alter table public.family_members      enable row level security;
alter table public.products            enable row level security;
alter table public.shopping_lists      enable row level security;
alter table public.shopping_list_items enable row level security;

-- ───────────── ส่งรายการ (ทำทั้งหมดในทรานแซกชันเดียว) ─────────────
-- p_items: [{ "product_id": uuid, "quantity": number, "note": text }]
-- - ใช้รายการ active ของครอบครัว (ไม่มีก็สร้างใหม่)
-- - สินค้าซ้ำในรายการเดิม → รวมจำนวน
-- - เก็บ name_snapshot / emoji / unit จากสินค้า ณ ตอนสั่ง
-- - use_count +1 และ last_ordered_at = now() ต่อสินค้า ต่อการส่ง 1 ครั้ง
create or replace function public.submit_order(p_family uuid, p_member uuid, p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_list  uuid;
  v_elem  jsonb;
  v_prod  public.products%rowtype;
  v_item  public.shopping_list_items%rowtype;
  v_qty   numeric;
  v_note  text;
  v_n     int := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty order';
  end if;

  perform 1 from public.family_members where id = p_member and family_id = p_family;
  if not found then
    raise exception 'invalid member';
  end if;

  select id into v_list
    from public.shopping_lists
   where family_id = p_family and status = 'active'
   for update;

  if v_list is null then
    insert into public.shopping_lists (family_id, created_by)
    values (p_family, p_member)
    on conflict (family_id) where status = 'active' do nothing
    returning id into v_list;

    if v_list is null then  -- อีกเครื่องสร้างตัดหน้าไปพอดี
      select id into v_list from public.shopping_lists
       where family_id = p_family and status = 'active';
    end if;
  end if;

  for v_elem in select * from jsonb_array_elements(p_items) loop
    select * into v_prod
      from public.products
     where id = (v_elem->>'product_id')::uuid
       and family_id = p_family
       and archived_at is null;
    if not found then
      continue;
    end if;

    v_qty  := coalesce((v_elem->>'quantity')::numeric, v_prod.default_quantity);
    v_note := nullif(btrim(coalesce(v_elem->>'note', '')), '');
    if v_qty <= 0 then
      continue;
    end if;

    select * into v_item
      from public.shopping_list_items
     where list_id = v_list and product_id = v_prod.id;

    if found then
      update public.shopping_list_items
         set quantity     = quantity + v_qty,
             is_purchased = false,
             purchased_at = null,
             note = case
                      when v_note is null then note
                      when note is null or note = '' then v_note
                      when note = v_note then note
                      else note || ' / ' || v_note
                    end
       where id = v_item.id;
    else
      insert into public.shopping_list_items
        (list_id, product_id, name_snapshot, emoji, quantity, unit, note, added_by)
      values
        (v_list, v_prod.id, v_prod.name, v_prod.emoji, v_qty, v_prod.unit, v_note, p_member);
    end if;

    update public.products
       set use_count = use_count + 1,
           last_ordered_at = now(),
           updated_at = now()
     where id = v_prod.id;

    v_n := v_n + 1;
  end loop;

  if v_n = 0 then
    raise exception 'no valid items';
  end if;

  return jsonb_build_object('list_id', v_list, 'count', v_n);
end;
$$;

-- ให้เรียกได้เฉพาะ service role (ผ่าน Server Actions)
revoke all on function public.submit_order(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_order(uuid, uuid, jsonb) to service_role;

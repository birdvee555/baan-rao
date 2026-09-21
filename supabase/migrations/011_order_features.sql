-- 011_order_features.sql
-- 1. เลขที่ออเดอร์ (Order No) & ตาราง order_counters
-- 2. สถานะยกเลิกออเดอร์ (cancelled) & cancelled_at
-- 3. ตาราง telegram_recipients (ผู้รับแจ้งเตือนหลายคน)
-- 4. Backfill เลขที่ออเดอร์ใบเก่า
-- 5. ปรับปรุง submit_order และ remove_list_item

-- ───────────── 1. ตาราง order_counters ─────────────
create table if not exists public.order_counters (
  family_id uuid not null references public.families(id) on delete cascade,
  ym text not null, -- พ.ศ. 2 หลัก + เดือน 2 หลัก เช่น '6909'
  last int not null default 0,
  primary key (family_id, ym)
);

alter table public.order_counters enable row level security;
create policy "Allow service_role full access on order_counters"
  on public.order_counters for all to service_role using (true) with check (true);

-- ───────────── 2. ขยาย shopping_lists ─────────────
alter table public.shopping_lists
  drop constraint if exists shopping_lists_status_check;

alter table public.shopping_lists
  add constraint shopping_lists_status_check
  check (status in ('active', 'done', 'cancelled'));

alter table public.shopping_lists
  add column if not exists order_no text,
  add column if not exists cancelled_at timestamptz;

create unique index if not exists idx_shopping_lists_family_order_no
  on public.shopping_lists (family_id, order_no)
  where order_no is not null;

-- ───────────── 3. ตาราง telegram_recipients ─────────────
create table if not exists public.telegram_recipients (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  chat_id bigint not null unique,
  label text not null default '',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_telegram_recipients_family_id
  on public.telegram_recipients (family_id);

alter table public.telegram_recipients enable row level security;
create policy "Allow service_role full access on telegram_recipients"
  on public.telegram_recipients for all to service_role using (true) with check (true);

-- ย้าย telegram_chat_id ที่มีอยู่ใน family_members มาเป็นแถวแรก
insert into public.telegram_recipients (family_id, chat_id, label, enabled)
select distinct on (telegram_chat_id)
  family_id,
  telegram_chat_id,
  coalesce(nullif(name, ''), 'ผู้รับหลัก'),
  true
from public.family_members
where telegram_chat_id is not null
on conflict (chat_id) do nothing;

-- ───────────── 4. ฟังก์ชันสร้างเลขที่ออเดอร์ ─────────────
create or replace function public.generate_next_order_no(p_family uuid, p_time timestamptz default now())
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bkk timestamptz;
  v_be_year int;
  v_ym text;
  v_last int;
begin
  v_bkk := timezone('Asia/Bangkok', coalesce(p_time, now()));
  v_be_year := extract(year from v_bkk)::int + 543;
  v_ym := right(v_be_year::text, 2) || to_char(v_bkk, 'MM');

  insert into public.order_counters (family_id, ym, last)
  values (p_family, v_ym, 1)
  on conflict (family_id, ym) do update
    set last = public.order_counters.last + 1
  returning last into v_last;

  return v_ym || lpad(v_last::text, 2, '0');
end;
$$;

revoke all on function public.generate_next_order_no(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.generate_next_order_no(uuid, timestamptz) to service_role;

-- ───────────── 5. Backfill เลขออเดอร์ใบเก่า ─────────────
do $$
declare
  r record;
  v_bkk timestamptz;
  v_be_year int;
  v_ym text;
  v_last int;
  v_order_no text;
begin
  for r in
    select id, family_id, created_at
      from public.shopping_lists
     where order_no is null
     order by family_id, created_at asc
  loop
    v_bkk := timezone('Asia/Bangkok', r.created_at);
    v_be_year := extract(year from v_bkk)::int + 543;
    v_ym := right(v_be_year::text, 2) || to_char(v_bkk, 'MM');

    insert into public.order_counters (family_id, ym, last)
    values (r.family_id, v_ym, 1)
    on conflict (family_id, ym) do update
      set last = public.order_counters.last + 1
    returning last into v_last;

    v_order_no := v_ym || lpad(v_last::text, 2, '0');

    update public.shopping_lists
       set order_no = v_order_no
     where id = r.id;
  end loop;
end;
$$;

-- ───────────── 6. ปรับ submit_order ─────────────
create or replace function public.submit_order(p_family uuid, p_member uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list      uuid;
  v_order_no  text;
  v_elem      jsonb;
  v_prod      public.products%rowtype;
  v_item      public.shopping_list_items%rowtype;
  v_qty       numeric;
  v_note      text;
  v_n         int := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty order';
  end if;

  perform 1 from public.family_members where id = p_member and family_id = p_family;
  if not found then
    raise exception 'invalid member';
  end if;

  select id, order_no into v_list, v_order_no
    from public.shopping_lists
   where family_id = p_family and status = 'active'
   for update;

  if v_list is null then
    v_order_no := public.generate_next_order_no(p_family, now());

    insert into public.shopping_lists (family_id, created_by, order_no, status)
    values (p_family, p_member, v_order_no, 'active')
    on conflict (family_id) where status = 'active' do nothing
    returning id, order_no into v_list, v_order_no;

    if v_list is null then  -- อีกเครื่องสร้างตัดหน้าไปพอดี
      select id, order_no into v_list, v_order_no
        from public.shopping_lists
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
       set use_count       = use_count + 1,
           last_ordered_at = now()
     where id = v_prod.id;

    v_n := v_n + 1;
  end loop;

  return jsonb_build_object('ok', true, 'count', v_n, 'order_no', v_order_no);
end;
$$;

revoke all on function public.submit_order(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_order(uuid, uuid, jsonb) to service_role;

-- ───────────── 7. ปรับ remove_list_item ─────────────
create or replace function public.remove_list_item(p_family uuid, p_item uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_list uuid;
  v_left int;
begin
  select id into v_list
    from public.shopping_lists
   where family_id = p_family and status = 'active'
   for update;
  if v_list is null then
    return jsonb_build_object('ok', false, 'error', 'no_active_list');
  end if;

  delete from public.shopping_list_items where id = p_item and list_id = v_list;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'item_not_found');
  end if;

  select count(*) into v_left from public.shopping_list_items where list_id = v_list;
  if v_left = 0 then
    -- เอาของชิ้นสุดท้ายออก = ยกเลิกทั้งใบ (ไม่ลบใบทิ้ง คงประวัติไว้)
    update public.shopping_lists
       set status = 'cancelled',
           cancelled_at = now()
     where id = v_list;
  end if;

  return jsonb_build_object('ok', true, 'list_cancelled', v_left = 0);
end;
$$;

revoke all on function public.remove_list_item(uuid, uuid) from public, anon, authenticated;
grant execute on function public.remove_list_item(uuid, uuid) to service_role;

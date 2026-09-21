-- บ้านเราซื้ออะไร — จำจำนวนล่าสุดที่สั่งของสินค้าแต่ละตัว (default_quantity = v_qty)
-- รันใน Supabase → SQL Editor

create or replace function public.submit_order(
  p_family uuid,
  p_member uuid,
  p_items  jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_list  uuid;
  v_elem  jsonb;
  v_prod  record;
  v_item  record;
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

    if v_list is null then
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

    -- จำจำนวนล่าสุดที่สั่ง + use_count
    update public.products
       set use_count = use_count + 1,
           default_quantity = v_qty,
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

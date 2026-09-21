-- เอาของออกจากรายการที่กำลังซื้อ (ทำในทรานแซกชันเดียว)
-- ล็อกแถวรายการใบ active เหมือน submit_order → ไม่ชนกันถ้าอีกเครื่องกดส่งพอดี
-- ถ้าเอาชิ้นสุดท้ายออก จะลบใบที่ว่างทิ้ง (ไม่ให้เหลือใบ 0 รายการมาบัง "สั่งเหมือนครั้งที่แล้ว")
create or replace function public.remove_list_item(p_family uuid, p_item uuid)
returns jsonb
language plpgsql
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
    return jsonb_build_object('ok', false);
  end if;

  delete from public.shopping_list_items where id = p_item and list_id = v_list;
  if not found then
    return jsonb_build_object('ok', false);
  end if;

  select count(*) into v_left from public.shopping_list_items where list_id = v_list;
  if v_left = 0 then
    delete from public.shopping_lists where id = v_list;
  end if;

  return jsonb_build_object('ok', true, 'list_deleted', v_left = 0);
end;
$$;

revoke all on function public.remove_list_item(uuid, uuid) from public, anon, authenticated;
grant execute on function public.remove_list_item(uuid, uuid) to service_role;

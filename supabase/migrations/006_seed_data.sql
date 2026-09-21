-- บ้านเราซื้ออะไร — ข้อมูลตัวอย่างสินค้าและประวัติการสั่ง (Seed Data)
-- รันใน Supabase → SQL Editor

do $$
declare
  f record;
  cat_fresh uuid;
  cat_veg uuid;
  cat_fruit uuid;
  cat_other uuid;
  m_muay uuid;
  m_uan uuid;
  v_list_id uuid;
  p_mu_san uuid;
  p_pla uuid;
  p_kung uuid;
  p_kai_wing uuid;
  p_kai_tub uuid;
  p_man_farang uuid;
  p_phak_kat uuid;
  p_kwang_tung uuid;
  p_tomato uuid;
  p_pumpkin uuid;
  p_ton_hom uuid;
  p_asparagus uuid;
  p_cucumber uuid;
  p_corn uuid;
  p_banana uuid;
begin
  -- วนลูปทุกครอบครัวในระบบ
  for f in select id, name from public.families loop
    -- ตรวจสอบ/สร้าง Categories 4 หมวด
    select id into cat_veg from public.categories where family_id = f.id and name = 'ผัก';
    if cat_veg is null then
      insert into public.categories (family_id, name, icon, sort_order)
      values (f.id, 'ผัก', '🥬', 1) returning id into cat_veg;
    end if;

    select id into cat_fresh from public.categories where family_id = f.id and name = 'ของสด';
    if cat_fresh is null then
      insert into public.categories (family_id, name, icon, sort_order)
      values (f.id, 'ของสด', '🥩', 2) returning id into cat_fresh;
    end if;

    select id into cat_fruit from public.categories where family_id = f.id and name = 'ผลไม้';
    if cat_fruit is null then
      insert into public.categories (family_id, name, icon, sort_order)
      values (f.id, 'ผลไม้', '🍎', 3) returning id into cat_fruit;
    end if;

    select id into cat_other from public.categories where family_id = f.id and name = 'อื่นๆ';
    if cat_other is null then
      insert into public.categories (family_id, name, icon, sort_order)
      values (f.id, 'อื่นๆ', '📦', 4) returning id into cat_other;
    end if;

    -- หาสมาชิก 'หมวย' และ 'อ้วน'
    select id into m_muay from public.family_members where family_id = f.id and name like '%หมวย%' limit 1;
    select id into m_uan from public.family_members where family_id = f.id and name like '%อ้วน%' limit 1;
    if m_muay is null then
      select id into m_muay from public.family_members where family_id = f.id limit 1;
    end if;
    if m_uan is null then
      m_uan := m_muay;
    end if;

    -- 🥩 หมวดของสด
    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fresh, 'หมูสันใน', '🥩', 'ชิ้น', 1, null, 10, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fresh, 'ปลา', '🐟', 'ตัว', 1, null, 5, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fresh, 'กุ้งแชบ๊วย', '🦐', 'ตัว', 8, null, 7, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fresh, 'ปีกไก่', '🍗', 'อัน', 8, null, 12, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fresh, 'ตับไก่', '🍖', 'ชิ้น', 1, null, 4, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fresh, 'หมูสับ', '🥩', 'กก.', 0.5, null, 8, now() - interval '2 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fresh, 'อกไก่', '🍗', 'ชิ้น', 2, null, 3, now() - interval '3 days')
    on conflict do nothing;

    -- 🥬 หมวดผัก
    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'มันฝรั่ง', '🥔', 'หัว', 2, 'หัวเล็ก', 4, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'ผักกาดขาว', '🥬', 'หัว', 1, null, 9, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'กวางตุ้งต้นใหญ่', '🥬', 'กำ', 2, 'สีเขียวอ่อน ๆ', 5, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'มะเขือเทศ', '🍅', 'ลูก', 1, null, 6, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'ฟักทอง', '🎃', 'ชิ้น', 1, 'เหลือง ๆ ส้ม ๆ', 3, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'ต้นหอม', '🌱', 'กำ', 1, null, 8, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'หน่อไม้ฝรั่ง', '/images/products/asparagus.png', 'ต้น', 8, null, 4, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'แตงกวา', '🥒', 'อัน', 2, 'ขออ่อน ๆ', 5, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'ข้าวโพดอ่อน', '🌽', 'ถุง', 1, 'เส้น ๆ ผอม ๆ', 4, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'ผักบุ้ง', '🥬', 'กำ', 1, null, 7, now() - interval '2 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'แครอท', '🥕', 'หัว', 2, null, 5, now() - interval '2 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_veg, 'หอมหัวใหญ่', '🧅', 'หัว', 2, null, 3, now() - interval '3 days')
    on conflict do nothing;

    -- 🍎 หมวดผลไม้
    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fruit, 'กล้วย', '🍌', 'หวี', 1, null, 6, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fruit, 'ส้ม', '🍊', 'ลูก', 4, null, 4, now() - interval '2 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fruit, 'แอปเปิล', '🍎', 'ลูก', 2, null, 3, now() - interval '3 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fruit, 'องุ่น', '🍇', 'ถุง', 1, null, 2, now() - interval '4 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fruit, 'แตงโม', '🍉', 'ลูก', 1, null, 1, now() - interval '5 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_fruit, 'ฝรั่ง', '🍐', 'ลูก', 2, null, 2, now() - interval '5 days')
    on conflict do nothing;

    -- 📦 หมวดอื่นๆ
    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_other, 'ไข่', '🥚', 'แผง', 1, null, 10, now() - interval '1 day')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_other, 'ข้าว', '🍚', 'ถุง', 1, null, 4, now() - interval '2 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_other, 'น้ำมันพืช', '🛢️', 'ขวด', 1, null, 2, now() - interval '4 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_other, 'น้ำปลา', '🧴', 'ขวด', 1, null, 3, now() - interval '3 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_other, 'น้ำตาล', '🧂', 'ถุง', 1, null, 2, now() - interval '5 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_other, 'นม', '🥛', 'กล่อง', 1, null, 5, now() - interval '2 days')
    on conflict do nothing;

    insert into public.products (family_id, category_id, name, emoji, unit, default_quantity, default_note, use_count, last_ordered_at)
    values (f.id, cat_other, 'ทิชชู่', '🧻', 'แพ็ค', 1, null, 3, now() - interval '3 days')
    on conflict do nothing;

    -- ดึง product_id ของ 15 รายการเพื่อทำ Sample Shopping History ล่าสุด
    select id into p_mu_san from public.products where family_id = f.id and name = 'หมูสันใน' limit 1;
    select id into p_pla from public.products where family_id = f.id and name = 'ปลา' limit 1;
    select id into p_kung from public.products where family_id = f.id and name = 'กุ้งแชบ๊วย' limit 1;
    select id into p_kai_wing from public.products where family_id = f.id and name = 'ปีกไก่' limit 1;
    select id into p_kai_tub from public.products where family_id = f.id and name = 'ตับไก่' limit 1;
    select id into p_man_farang from public.products where family_id = f.id and name = 'มันฝรั่ง' limit 1;
    select id into p_phak_kat from public.products where family_id = f.id and name = 'ผักกาดขาว' limit 1;
    select id into p_kwang_tung from public.products where family_id = f.id and name = 'กวางตุ้งต้นใหญ่' limit 1;
    select id into p_tomato from public.products where family_id = f.id and name = 'มะเขือเทศ' limit 1;
    select id into p_pumpkin from public.products where family_id = f.id and name = 'ฟักทอง' limit 1;
    select id into p_ton_hom from public.products where family_id = f.id and name = 'ต้นหอม' limit 1;
    select id into p_asparagus from public.products where family_id = f.id and name = 'หน่อไม้ฝรั่ง' limit 1;
    select id into p_cucumber from public.products where family_id = f.id and name = 'แตงกวา' limit 1;
    select id into p_corn from public.products where family_id = f.id and name = 'ข้าวโพดอ่อน' limit 1;
    select id into p_banana from public.products where family_id = f.id and name = 'กล้วย' limit 1;

    -- ตรวจสอบว่ามี shopping_lists ในอดีตหรือไม่ ถ้ายังไม่มีให้สร้าง 1 ใบประวัติที่สมบูรณ์
    if not exists (select 1 from public.shopping_lists where family_id = f.id and status = 'done') then
      insert into public.shopping_lists (family_id, created_by, status, created_at, completed_at)
      values (f.id, m_muay, 'done', now() - interval '1 day', now() - interval '1 day' + interval '2 hours')
      returning id into v_list_id;

      -- เพิ่ม 15 รายการลงในประวัติ
      insert into public.shopping_list_items (list_id, product_id, name_snapshot, emoji, quantity, unit, note, is_purchased, purchased_at, added_by)
      values
        (v_list_id, p_mu_san, 'หมูสันใน', '🥩', 1, 'ชิ้น', null, true, now() - interval '1 day', m_muay),
        (v_list_id, p_pla, 'ปลา', '🐟', 1, 'ตัว', null, true, now() - interval '1 day', m_muay),
        (v_list_id, p_kung, 'กุ้งแชบ๊วย', '🦐', 8, 'ตัว', null, true, now() - interval '1 day', m_muay),
        (v_list_id, p_kai_wing, 'ปีกไก่', '🍗', 8, 'อัน', null, true, now() - interval '1 day', m_muay),
        (v_list_id, p_kai_tub, 'ตับไก่', '🍖', 1, 'ชิ้น', null, true, now() - interval '1 day', m_muay),
        (v_list_id, p_man_farang, 'มันฝรั่ง', '🥔', 2, 'หัว', 'หัวเล็ก', true, now() - interval '1 day', m_muay),
        (v_list_id, p_phak_kat, 'ผักกาดขาว', '🥬', 1, 'หัว', null, true, now() - interval '1 day', m_muay),
        (v_list_id, p_kwang_tung, 'กวางตุ้งต้นใหญ่', '🥬', 2, 'กำ', 'สีเขียวอ่อน ๆ', true, now() - interval '1 day', m_muay),
        (v_list_id, p_tomato, 'มะเขือเทศ', '🍅', 1, 'ลูก', null, true, now() - interval '1 day', m_muay),
        (v_list_id, p_pumpkin, 'ฟักทอง', '🎃', 1, 'ชิ้น', 'เหลือง ๆ ส้ม ๆ', true, now() - interval '1 day', m_muay),
        (v_list_id, p_ton_hom, 'ต้นหอม', '🌱', 1, 'กำ', null, true, now() - interval '1 day', m_muay),
        (v_list_id, p_asparagus, 'หน่อไม้ฝรั่ง', '🌽', 8, 'ต้น', null, true, now() - interval '1 day', m_muay),
        (v_list_id, p_cucumber, 'แตงกวา', '🥒', 2, 'อัน', 'ขออ่อน ๆ', true, now() - interval '1 day', m_muay),
        (v_list_id, p_corn, 'ข้าวโพดอ่อน', '🌽', 1, 'ถุง', 'เส้น ๆ ผอม ๆ', true, now() - interval '1 day', m_muay),
        (v_list_id, p_banana, 'กล้วย', '🍌', 1, 'หวี', null, true, now() - interval '1 day', m_muay);
    end if;
  end loop;
end $$;

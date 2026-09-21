const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(url, key);

const SEED_PRODUCTS = [
  // ของสด
  { name: 'หมูสันใน', emoji: '🥩', unit: 'ชิ้น', default_quantity: 1, category: 'ของสด', use_count: 10 },
  { name: 'ปลา', emoji: '🐟', unit: 'ตัว', default_quantity: 1, category: 'ของสด', use_count: 5 },
  { name: 'กุ้งแชบ๊วย', emoji: '🦐', unit: 'ตัว', default_quantity: 8, category: 'ของสด', use_count: 7 },
  { name: 'ปีกไก่', emoji: '🍗', unit: 'อัน', default_quantity: 8, category: 'ของสด', use_count: 12 },
  { name: 'ตับไก่', emoji: '🫀', unit: 'ชิ้น', default_quantity: 1, category: 'ของสด', use_count: 4 },
  { name: 'หมูสับ', emoji: '🥩', unit: 'กก.', default_quantity: 0.5, category: 'ของสด', use_count: 8 },
  { name: 'อกไก่', emoji: '🍗', unit: 'ชิ้น', default_quantity: 2, category: 'ของสด', use_count: 3 },
  // ผัก
  { name: 'มันฝรั่ง', emoji: '🥔', unit: 'หัว', default_quantity: 2, category: 'ผัก', default_note: 'หัวเล็ก', use_count: 4 },
  { name: 'ผักกาดขาว', emoji: '🥬', unit: 'หัว', default_quantity: 1, category: 'ผัก', use_count: 9 },
  { name: 'กวางตุ้งต้นใหญ่', emoji: '🥬', unit: 'กำ', default_quantity: 2, category: 'ผัก', default_note: 'สีเขียวอ่อน ๆ', use_count: 5 },
  { name: 'มะเขือเทศ', emoji: '🍅', unit: 'ลูก', default_quantity: 1, category: 'ผัก', use_count: 6 },
  { name: 'ฟักทอง', emoji: '🎃', unit: 'ชิ้น', default_quantity: 1, category: 'ผัก', default_note: 'เหลือง ๆ ส้ม ๆ', use_count: 3 },
  { name: 'ต้นหอม', emoji: '🌱', unit: 'กำ', default_quantity: 1, category: 'ผัก', use_count: 8 },
  { name: 'หน่อไม้ฝรั่ง', emoji: '🌿', unit: 'ต้น', default_quantity: 8, category: 'ผัก', use_count: 4 },
  { name: 'แตงกวา', emoji: '🥒', unit: 'อัน', default_quantity: 2, category: 'ผัก', default_note: 'ขออ่อน ๆ', use_count: 5 },
  { name: 'ข้าวโพดอ่อน', emoji: '🌽', unit: 'ถุง', default_quantity: 1, category: 'ผัก', default_note: 'เส้น ๆ ผอม ๆ', use_count: 4 },
  { name: 'ผักบุ้ง', emoji: '🌿', unit: 'กำ', default_quantity: 1, category: 'ผัก', use_count: 7 },
  { name: 'แครอท', emoji: '🥕', unit: 'หัว', default_quantity: 2, category: 'ผัก', use_count: 5 },
  { name: 'หอมหัวใหญ่', emoji: '🧅', unit: 'หัว', default_quantity: 2, category: 'ผัก', use_count: 3 },
  // ผลไม้
  { name: 'กล้วย', emoji: '🍌', unit: 'หวี', default_quantity: 1, category: 'ผลไม้', use_count: 6 },
  { name: 'ส้ม', emoji: '🍊', unit: 'ลูก', default_quantity: 4, category: 'ผลไม้', use_count: 4 },
  { name: 'แอปเปิล', emoji: '🍎', unit: 'ลูก', default_quantity: 2, category: 'ผลไม้', use_count: 3 },
  { name: 'องุ่น', emoji: '🍇', unit: 'ถุง', default_quantity: 1, category: 'ผลไม้', use_count: 2 },
  { name: 'แตงโม', emoji: '🍉', unit: 'ลูก', default_quantity: 1, category: 'ผลไม้', use_count: 1 },
  { name: 'ฝรั่ง', emoji: '🍐', unit: 'ลูก', default_quantity: 2, category: 'ผลไม้', use_count: 2 },
  // อื่นๆ
  { name: 'ไข่', emoji: '🥚', unit: 'แผง', default_quantity: 1, category: 'อื่นๆ', use_count: 10 },
  { name: 'ข้าว', emoji: '🍚', unit: 'ถุง', default_quantity: 1, category: 'อื่นๆ', use_count: 4 },
  { name: 'น้ำมันพืช', emoji: '🫗', unit: 'ขวด', default_quantity: 1, category: 'อื่นๆ', use_count: 2 },
  { name: 'น้ำปลา', emoji: '🧂', unit: 'ขวด', default_quantity: 1, category: 'อื่นๆ', use_count: 3 },
  { name: 'น้ำตาล', emoji: '🧂', unit: 'ถุง', default_quantity: 1, category: 'อื่นๆ', use_count: 2 },
  { name: 'นม', emoji: '🥛', unit: 'กล่อง', default_quantity: 1, category: 'อื่นๆ', use_count: 5 },
  { name: 'ทิชชู่', emoji: '🧻', unit: 'แพ็ค', default_quantity: 1, category: 'อื่นๆ', use_count: 3 },
];

const REORDER_15_NAMES = [
  'หมูสันใน', 'ปลา', 'กุ้งแชบ๊วย', 'ปีกไก่', 'ตับไก่',
  'มันฝรั่ง', 'ผักกาดขาว', 'กวางตุ้งต้นใหญ่', 'มะเขือเทศ', 'ฟักทอง',
  'ต้นหอม', 'หน่อไม้ฝรั่ง', 'แตงกวา', 'ข้าวโพดอ่อน', 'กล้วย'
];

async function seed() {
  const { data: families, error: famErr } = await supabase.from('families').select('*');
  if (famErr || !families || families.length === 0) {
    console.log("No families found to seed.");
    return;
  }

  for (const fam of families) {
    console.log(`Seeding family: ${fam.name} (${fam.id})`);

    // 1. Categories
    const defaultCats = [
      { name: 'ผัก', icon: '🥬', sort_order: 1 },
      { name: 'ของสด', icon: '🥩', sort_order: 2 },
      { name: 'ผลไม้', icon: '🍎', sort_order: 3 },
      { name: 'อื่นๆ', icon: '📦', sort_order: 4 },
    ];

    for (const c of defaultCats) {
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('family_id', fam.id)
        .eq('name', c.name)
        .maybeSingle();

      if (!existing) {
        await supabase.from('categories').insert({ family_id: fam.id, ...c });
      }
    }

    const { data: catRows } = await supabase.from('categories').select('*').eq('family_id', fam.id);
    const catMap = new Map((catRows || []).map((c) => [c.name, c.id]));

    // 2. Members
    const { data: members } = await supabase.from('family_members').select('*').eq('family_id', fam.id);
    const muay = (members || []).find((m) => m.name.includes('หมวย')) || members?.[0];

    // 3. Products
    const prodMap = new Map();
    for (const p of SEED_PRODUCTS) {
      const catId = catMap.get(p.category) || null;
      const { data: existing } = await supabase
        .from('products')
        .select('id, name')
        .eq('family_id', fam.id)
        .eq('name', p.name)
        .maybeSingle();

      if (existing) {
        await supabase.from('products').update({
          category_id: catId,
          emoji: p.emoji,
          unit: p.unit,
          default_quantity: p.default_quantity,
          default_note: p.default_note || null,
          use_count: p.use_count,
          last_ordered_at: new Date(Date.now() - 86400000).toISOString(),
          archived_at: null,
        }).eq('id', existing.id);
        prodMap.set(p.name, existing.id);
      } else {
        const { data: inserted } = await supabase.from('products').insert({
          family_id: fam.id,
          category_id: catId,
          name: p.name,
          emoji: p.emoji,
          unit: p.unit,
          default_quantity: p.default_quantity,
          default_note: p.default_note || null,
          use_count: p.use_count,
          last_ordered_at: new Date(Date.now() - 86400000).toISOString(),
        }).select('id, name').single();
        if (inserted) prodMap.set(p.name, inserted.id);
      }
    }

    // 4. Sample Shopping History (15 items)
    const { data: existingDone } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('family_id', fam.id)
      .eq('status', 'done')
      .limit(1);

    if (!existingDone || existingDone.length === 0) {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const { data: list } = await supabase
        .from('shopping_lists')
        .insert({
          family_id: fam.id,
          created_by: muay?.id || null,
          status: 'done',
          created_at: yesterday,
          completed_at: yesterday,
        })
        .select('id')
        .single();

      if (list) {
        const itemsToInsert = [];
        for (const name of REORDER_15_NAMES) {
          const pDef = SEED_PRODUCTS.find((p) => p.name === name);
          const pId = prodMap.get(name);
          if (pDef && pId) {
            itemsToInsert.push({
              list_id: list.id,
              product_id: pId,
              name_snapshot: pDef.name,
              emoji: pDef.emoji,
              quantity: pDef.default_quantity,
              unit: pDef.unit,
              note: pDef.default_note || null,
              is_purchased: true,
              purchased_at: yesterday,
              added_by: muay?.id || null,
            });
          }
        }
        if (itemsToInsert.length > 0) {
          await supabase.from('shopping_list_items').insert(itemsToInsert);
          console.log(`Created sample history with ${itemsToInsert.length} items for ${fam.name}`);
        }
      }
    }
  }

  console.log("Seed finished successfully!");
}

seed();

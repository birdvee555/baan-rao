export const DEFAULT_CATEGORIES = [
  { name: "ผัก", icon: "🥬", sort_order: 1 },
  { name: "ของสด", icon: "🥩", sort_order: 2 },
  { name: "ผลไม้", icon: "🍎", sort_order: 3 },
  { name: "อื่นๆ", icon: "📦", sort_order: 4 },
] as const;

export type DefaultCategoryName = (typeof DEFAULT_CATEGORIES)[number]["name"];

export const VEG_NAMES = new Set([
  "มันฝรั่ง", "ผักกาดขาว", "กวางตุ้งต้นใหญ่", "กวางตุ้ง", "มะเขือเทศ", "ฟักทอง",
  "ต้นหอม", "หน่อไม้ฝรั่ง", "แตงกวา", "ข้าวโพดอ่อน", "ผักบุ้ง", "แครอท", "หอมหัวใหญ่",
  "ผักสลัด", "กะหล่ำปลี", "บรอกโคลี", "เห็ด", "พริก", "กระเทียม", "ขิง", "ข่า", "ตะไคร้",
  "ใบกะเพรา", "โหระพา", "ผักชี", "คื่นช่าย", "มะนาว", "ถั่วงอก", "ฟักเขียว",
]);

export const FRESH_NAMES = new Set([
  "หมูสันใน", "ปลา", "กุ้งแชบ๊วย", "ปีกไก่", "ตับไก่", "หมูสับ", "อกไก่",
  "ไข่", "ไข่ไก่", "ไข่เป็ด", "เนื้อวัว", "ปลาหมึก", "หอย", "หมูกรอบ", "สามชั้น", "เบคอน",
  "ไส้กรอก", "ลูกชิ้น", "เต้าหู้", "เนื้อหมู", "สันคอหมู", "ซี่โครงหมู", "แซลมอน",
]);

export const FRUIT_NAMES = new Set([
  "กล้วย", "ส้ม", "แอปเปิล", "องุ่น", "แตงโม", "ฝรั่ง", "มะละกอ", "มะม่วง", "สับปะรด",
  "แก้วมังกร", "มังคุด", "ทุเรียน", "ชมพู่", "ลำไย", "เงาะ", "สตรอว์เบอร์รี", "เมลอน",
]);

export type CategoryInfo = { id: string; name: string; icon: string; sort_order?: number };

export function categorizeProduct(
  name: string,
  categoryId?: string | null,
  categories?: CategoryInfo[]
): CategoryInfo {
  const cats = categories && categories.length > 0
    ? categories
    : DEFAULT_CATEGORIES.map((c) => ({ id: `cat_${c.name}`, name: c.name, icon: c.icon, sort_order: c.sort_order }));

  const veg = cats.find((c) => c.name === "ผัก" || c.icon === "🥬") || { id: "cat_veg", name: "ผัก", icon: "🥬" };
  const fresh = cats.find((c) => c.name === "ของสด" || c.icon === "🥩") || { id: "cat_fresh", name: "ของสด", icon: "🥩" };
  const fruit = cats.find((c) => c.name === "ผลไม้" || c.icon === "🍎") || { id: "cat_fruit", name: "ผลไม้", icon: "🍎" };
  const other = cats.find((c) => c.name === "อื่นๆ" || c.icon === "📦") || { id: "cat_other", name: "อื่นๆ", icon: "📦" };

  if (categoryId) {
    const found = cats.find((c) => c.id === categoryId);
    if (found) return found;
  }

  const clean = name.trim();
  if (VEG_NAMES.has(clean)) return veg;
  if (FRESH_NAMES.has(clean)) return fresh;
  if (FRUIT_NAMES.has(clean)) return fruit;

  for (const n of VEG_NAMES) if (clean.includes(n)) return veg;
  for (const n of FRESH_NAMES) if (clean.includes(n)) return fresh;
  for (const n of FRUIT_NAMES) if (clean.includes(n)) return fruit;

  return other;
}

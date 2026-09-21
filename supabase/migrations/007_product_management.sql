-- 007_product_management.sql
-- เพิ่มคอลัมน์ icon, icon_source, is_active ให้กับตาราง products
-- และอัปเดตข้อมูลเดิมให้สมบูรณ์

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS icon_source text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- คัดลอกค่าเริ่มต้นสำหรับสินค้าเดิม
UPDATE public.products
SET icon = COALESCE(icon, emoji, '🛒'),
    icon_source = COALESCE(icon_source, 'auto'),
    is_active = (archived_at IS NULL)
WHERE icon IS NULL OR icon_source IS NULL OR is_active IS NULL;

-- อัปเดตสินค้า 'หน่อไม้ฝรั่ง' เป็น 🌿 ตาม requirement
UPDATE public.products
SET icon = '🌿',
    emoji = '🌿'
WHERE name = 'หน่อไม้ฝรั่ง' AND (icon_source IS NULL OR icon_source = 'auto');

-- อัปเดตสินค้า 'ตับไก่' เป็น 🫀
UPDATE public.products
SET icon = '🫀',
    emoji = '🫀'
WHERE name = 'ตับไก่' AND (icon_source IS NULL OR icon_source = 'auto');

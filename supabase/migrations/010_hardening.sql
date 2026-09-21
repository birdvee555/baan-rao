-- 010_hardening.sql
-- ปรับปรุงความปลอดภัยของฟังก์ชันฐานข้อมูล:
-- 1. ตั้งค่า search_path = public บนฟังก์ชัน SECURITY DEFINER และฟังก์ชันจัดการออเดอร์
-- 2. จำกัดสิทธิ์การเรียกใช้งาน ให้เรียกได้เฉพาะ service_role เท่านั้น

-- submit_order
ALTER FUNCTION public.submit_order(uuid, uuid, jsonb) SET search_path = public;
REVOKE ALL ON FUNCTION public.submit_order(uuid, uuid, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_order(uuid, uuid, jsonb) TO service_role;

-- remove_list_item
ALTER FUNCTION public.remove_list_item(uuid, uuid) SET search_path = public;
REVOKE ALL ON FUNCTION public.remove_list_item(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remove_list_item(uuid, uuid) TO service_role;

-- 008_telegram_enhancements.sql
-- เพิ่ม telegram_username และ telegram_notifications_enabled ใน family_members

ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS telegram_username text,
  ADD COLUMN IF NOT EXISTS telegram_notifications_enabled boolean DEFAULT true;

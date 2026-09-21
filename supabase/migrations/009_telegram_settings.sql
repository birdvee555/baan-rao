-- 009_telegram_settings.sql
-- สร้างตาราง telegram_settings สำหรับเก็บการตั้งค่า Telegram ของแต่ละครอบครัวใน Web App

CREATE TABLE IF NOT EXISTS public.telegram_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE UNIQUE,
  bot_username text,
  bot_token_encrypted text,
  is_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- เพิ่ม index สำหรับ family_id
CREATE INDEX IF NOT EXISTS idx_telegram_settings_family_id ON public.telegram_settings(family_id);

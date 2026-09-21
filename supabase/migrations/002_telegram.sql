-- แจ้งเตือน Telegram: เก็บ chat_id ส่วนตัวของสมาชิกแต่ละคน (ได้จากการกด Start กับบอท)
alter table public.family_members
  add column if not exists telegram_chat_id bigint;

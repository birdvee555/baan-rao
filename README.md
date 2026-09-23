# 🏠 บ้านเราซื้ออะไร

เว็บแอปสำหรับจดและสั่งซื้อของเข้าบ้าน ออกแบบสไตล์ Mobile-first Pastel (Cream & Mint) ใช้งานง่ายเพียงแตะเลือก ไม่ต้องพิมพ์ซ้ำ พร้อมระบบจัดหมวดหมู่ โหมดโฟกัสขณะเดินตลาด และการแจ้งเตือนผ่าน Telegram

**Tech Stack**: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · Supabase (PostgreSQL) · Vercel

---

## 🚀 คุณสมบัติเด่น (Features)

- **ประตูผ่านรหัสเดียว (Single Password Gate)**: ป้องกันบุคคลภายนอกด้วยรหัสผ่านเดียว (`APP_PASSWORD`) โดยเซ็นคุกกี้ HMAC-SHA256 อายุ 1 ปี ไม่ต้องล็อกอินซ้ำบ่อยครั้ง และไม่ต้องเลือกผู้ใช้
- **แตะเลือกของได้ทันที**: หมวดหมู่สินค้า ผักสด เนื้อสัตว์ เครื่องปรุง ของใช้ในบ้าน พร้อมหมวด "⭐ ซื้อบ่อย" (Smart Section)
- **โหมดโฟกัสขณะเดินตลาด (Focus Mode)**: สลับซ่อนรายการที่ซื้อแล้ว ช่วยให้ไม่สับสนขณะเดินซื้อของจริง
- **จัดการสินค้าได้เอง**: เพิ่มสินค้าใหม่ แก้ไขชื่อ อีโมจิ หน่วย หรือซ่อนสินค้าที่ไม่ต้องการ
- **Telegram Notification & Webhook**: แจ้งเตือนรายการของเข้า Telegram และผูกบัญชีด้วย Webhook ผ่านหน้าเว็บได้ทันที
- **นัดหมาย (Appointments)**: จัดการนัดหมายของคนในบ้าน (เด็ก/ผู้ใหญ่) เช่น หาหมอ ฉีดวัคซีน สอบ พร้อมตั้งเวลาเตือนล่วงหน้าผ่าน Telegram
- **ของรอเพย์เดย์ (Restock Items)**: แปะลิงก์ของใช้ที่เล็งไว้ (Shopee, TikTok, Lazada ฯลฯ) พร้อมแจ้งเตือนสรุปรายการอัตโนมัติทุกวันที่ 25 ของเดือน
- **Supabase Free Tier Keepalive & Reminders**: มี Cron Job สำหรับปลุกฐานข้อมูล และส่งการแจ้งเตือนนัดหมายและของรอเพย์เดย์

---

## 📋 ตัวแปรสภาพแวดล้อม (Environment Variables)

ตั้งค่าใน `.env.local` สำหรับการพัฒนาในเครื่อง และตั้งค่าใน Vercel Environment Variables:

| ตัวแปร | จำเป็น | คำอธิบาย / วิธีตั้งค่า |
|---|:---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL ของ Supabase Project จาก Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon Key ของ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service Role Key (ห้ามมี prefix `NEXT_PUBLIC_`) |
| `SESSION_SECRET` | ✅ | ความยาวอย่างน้อย 32 ตัวอักษร สุ่มด้วย `openssl rand -base64 32` |
| `APP_PASSWORD` | ✅ | รหัสผ่านสำหรับปลดล็อกเข้าเว็บแอป (บน Production หากไม่ตั้งค่า ระบบจะปฏิเสธการเข้าถึงทันที) |
| `TELEGRAM_ENCRYPTION_KEY` | ✅ (ถ้าใช้ Bot) | คีย์ความยาวอย่างน้อย 32 ตัวอักษร สำหรับเข้ารหัส AES-256 Bot Token ในฐานข้อมูล |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ (ถ้าใช้ Bot) | สตริงสุ่มยาว 16-32 ตัวอักษร สำหรับตรวจสอบ Telegram Webhook request |
| `APP_URL` | ✅ (ถ้าใช้ Bot) | URL โดเมนของแอป (ต้องเป็น `https://...` บน Production) |
| `CRON_SECRET` | ✅ (ถ้าใช้ Cron) | สตริงสุ่มสำหรับ Vercel Cron หรือ External Cron เพื่อเรียก `/api/keepalive` และ `/api/reminders` |

> [!WARNING]
> การเปลี่ยน `TELEGRAM_ENCRYPTION_KEY` จะทำให้ Bot Token เดิมที่เข้ารหัสไว้ในตาราง `telegram_settings` ถอดรหัสไม่ได้ หากมีการเปลี่ยนคีย์ ต้องเข้าไปกรอก Bot Token ใหม่ในหน้า `/notify`

---

## 🗄️ ลำดับการรัน Database Migrations (001 - 012)

ให้รันไฟล์ SQL ในโฟลเดอร์ `supabase/migrations/` ผ่านทาง Supabase Dashboard → **SQL Editor** ตามลำดับดังนี้:

1. `001_init.sql`: โครงสร้างหลัก (ตาราง families, family_members, categories, products, shopping_lists, shopping_list_items)
2. `002_telegram.sql`: คอลัมน์สำหรับ Telegram Chat ID ใน family_members
3. `003_item_edit.sql`: ฟังก์ชัน `remove_list_item` สำหรับลบของออกจากรายการในทรานแซกชันเดียว
4. `004_categories.sql`: ตารางและฟังก์ชันหมวดหมู่สินค้า
5. `005_remember_last_qty.sql`: ฟังก์ชัน `submit_order` สำหรับบันทึกคำสั่งซื้อ
   > **หมายเหตุการออกแบบ**: ฟังก์ชันนี้มีคำสั่ง `default_quantity = v_qty` โดยตั้งใจ เพื่อจดจำจำนวนล่าสุดที่ผู้ใช้สั่งซื้อสินค้าชิ้นนั้น ๆ ให้กลายเป็นค่าเริ่มต้นในการสั่งซื้อครั้งต่อไปโดยอัตโนมัติ
6. `006_seed_data.sql`: ข้อมูลเริ่มต้น
7. `007_product_management.sql`: รองรับการปรับแต่งไอคอนและการซ่อนสินค้า (`archived_at`)
8. `008_telegram_enhancements.sql`: ปรับปรุงระบบแจ้งเตือน Telegram
9. `009_telegram_settings.sql`: ตาราง `telegram_settings` สำหรับเก็บ Bot Token ที่เข้ารหัสปลอดภัย
10. `010_hardening.sql`: เสริมความปลอดภัย `search_path = public` บนฟังก์ชัน `submit_order` และ `remove_list_item` พร้อมจำกัดสิทธิ์ให้เฉพาะ `service_role`
11. `011_order_features.sql`: ฟีเจอร์เพิ่มเติมสำหรับออเดอร์และการจัดการสินค้า
12. `012_appointments_and_restock.sql`: ตาราง `people`, `appointments`, `restock_items`, `restock_reminder_log` สำหรับฟีเจอร์นัดหมายและของรอเพย์เดย์

---

## ⏰ การตั้งค่า Cron Job สำหรับแจ้งเตือน (cron-job.org)

ฟีเจอร์แจ้งเตือนนัดหมายล่วงหน้า และแจ้งเตือนของรอเพย์เดย์วันที่ 25 ต้องอาศัยการเรียก `/api/reminders` เป็นประจำ (แนะนำทุก 1 ชั่วโมง):

1. สมัครใช้งานฟรีที่ [cron-job.org](https://cron-job.org)
2. ไปที่ **Cronjobs** → **Create Cronjob**
3. ตั้งค่าดังนี้:
   - **Title**: `Baan Rao Reminders`
   - **URL**: `https://<YOUR_APP_URL>/api/reminders` (เช่น `https://baan-rao.vercel.app/api/reminders`)
   - **Execution schedule**: Every 1 hour (หรือทุกชั่วโมง)
   - ในแท็บ **Advanced**:
     - **Request method**: `GET`
     - **Headers**: เพิ่ม Header:
       - Name: `Authorization`
       - Value: `Bearer <CRON_SECRET>` (ตรงกับค่า `CRON_SECRET` ใน Environment Variables)
4. กด **Create** เพื่อบันทึก

---

## 🛠️ การติดตั้งและการรันในเครื่อง (Local Development)

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. คัดลอกและตั้งค่า .env.local
cp .env.example .env.local

# 3. รัน Development Server
npm run dev
# เปิด http://localhost:3000
```

---

## 🚢 ขั้นตอนการ Deploy ขึ้น Vercel

1. Push โค้ดทั้งหมดขึ้น GitHub Repository
2. เข้าที่ [Vercel Dashboard](https://vercel.com) แล้วกด **Add New Project** → Import โปรเจกต์
3. ในหน้า Configuration ให้เพิ่ม **Environment Variables** ครบทั้ง 9 ตัวตามตารางด้านบน
4. กด **Deploy**
5. ตรวจสอบหลัง Deploy:
   - เปิด URL ของแอปบนมือถือ → จะต้องพบหน้า **ใส่รหัสผ่านเข้าใช้งาน** (`/unlock`)
   - กรอกรหัสผ่านที่ตั้งใน `APP_PASSWORD` → เข้าสู่หน้ารายการสั่งของ
   - ไปที่หน้า **🔔 แจ้งเตือน** (`/notify`) → บันทึก Bot Token และกดปุ่ม **"ตั้งค่า Webhook บนเซิร์ฟเวอร์นี้"**
   - กดปุ่ม **"เชื่อม Telegram"** เพื่อรับการแจ้งเตือนเข้าบอท
   - ตั้งค่า Cron Job ที่ cron-job.org ตามคู่มือด้านบน

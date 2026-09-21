import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * ปลุกฐานข้อมูล: Vercel Cron เรียกวันละครั้ง (ดู vercel.json)
 * Supabase แพ็กเกจฟรีจะพักโปรเจกต์ที่ไม่มีการใช้งานราว 7 วัน — คำขอนี้ทำให้มีกิจกรรมทุกวัน
 * Vercel แนบ "Authorization: Bearer $CRON_SECRET" มาให้เองเมื่อตั้ง env CRON_SECRET
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, error: "CRON_SECRET not set" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const { error } = await db().from("families").select("id").limit(1);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, at: new Date().toISOString() });
}

/**
 * ส่งสัญญาณ "มีการเปลี่ยนแปลง" ไปยังมือถือเครื่องอื่นของครอบครัว
 * ไม่ส่งข้อมูลจริง — เครื่องอื่นรับสัญญาณแล้วดึงข้อมูลผ่านเซิร์ฟเวอร์ (ที่ตรวจ PIN แล้ว) อีกที
 * ช่องใช้ชื่อสุ่มต่อครอบครัว (families.realtime_key)
 */
export async function pingFamily(realtimeKey: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { topic: `family-${realtimeKey}`, event: "changed", payload: {}, private: false },
        ],
      }),
    });
  } catch {
    // Realtime ล่มไม่ควรทำให้การสั่งของล้ม — เครื่องอื่นจะเห็นเมื่อเปิดแอปครั้งถัดไป
  }
}

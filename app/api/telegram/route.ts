import { db } from "@/lib/db";
import { pingFamily } from "@/lib/realtime";
import { parseLinkCode, tgSend } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const ok = () => new Response("ok");

/** Webhook ของบอท: รับ /start <code> เพื่อผูกแชทส่วนตัวกับสมาชิก และ /stop เพื่อยกเลิก */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  let update: {
    message?: {
      text?: string;
      chat?: { id?: number; type?: string };
      from?: { username?: string };
    };
  };
  try {
    update = await req.json();
  } catch {
    return ok();
  }

  const msg = update.message;
  const chatId = msg?.chat?.id;
  if (typeof chatId !== "number" || msg?.chat?.type !== "private") return ok();
  const text = String(msg?.text ?? "").trim();

  // ดึงครอบครัวหลักเพื่อเอา botToken จาก telegram_settings สำหรับตอบกลับทุกข้อความ
  const { data: defaultFam } = await db()
    .from("families")
    .select("id,realtime_key")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { getFamilyTelegramConfig } = await import("@/lib/telegram-config");
  const defaultCfg = defaultFam ? await getFamilyTelegramConfig(defaultFam.id) : null;
  const botToken = defaultCfg?.botToken || undefined;

  if (text.startsWith("/start")) {
    const memberId = parseLinkCode(text.slice(6).trim());
    const { data: m } = memberId
      ? await db().from("family_members").select("id,name,family_id").eq("id", memberId).maybeSingle()
      : { data: null };

    if (!m) {
      await tgSend(chatId, "สวัสดี 👋 เปิดแอป \"บ้านเราซื้ออะไร\" แล้วกดปุ่ม \"เชื่อม Telegram\" เพื่อผูกบัญชีนี้ก่อนนะ", botToken);
      return ok();
    }

    const username = msg?.from?.username ? `@${msg.from.username}` : null;
    await db().from("family_members").update({ telegram_chat_id: null, telegram_username: null }).eq("telegram_chat_id", chatId);
    
    let updateRes = await db()
      .from("family_members")
      .update({ telegram_chat_id: chatId, telegram_username: username, telegram_notifications_enabled: true })
      .eq("id", m.id);

    if (updateRes.error && updateRes.error.code === "42703") {
      await db().from("family_members").update({ telegram_chat_id: chatId }).eq("id", m.id);
    }

    await tgSend(
      chatId,
      `เชื่อมแล้ว ✓\n${m.name} จะได้รับแจ้งเตือนเมื่อมีคนอื่นในบ้านสั่งของ\nพิมพ์ /stop เมื่อต้องการปิดการแจ้งเตือน`,
      botToken,
    );

    const { data: fam } = await db().from("families").select("realtime_key").eq("id", m.family_id).maybeSingle();
    if (fam) await pingFamily(fam.realtime_key); // ให้หน้า "แจ้งเตือน" ในแอปอัปเดตเอง
  } else if (text === "/stop") {
    let stopRes = await db().from("family_members").update({ telegram_chat_id: null, telegram_username: null }).eq("telegram_chat_id", chatId);
    if (stopRes.error && stopRes.error.code === "42703") {
      await db().from("family_members").update({ telegram_chat_id: null }).eq("telegram_chat_id", chatId);
    }

    await tgSend(chatId, "ปิดการแจ้งเตือนแล้ว เปิดใหม่ได้จากแอปเมื่อไหร่ก็ได้", botToken);
  }

  return ok();
}

import { createHmac, timingSafeEqual } from "crypto";
import { db } from "./db";
import { fmtQty } from "./format";

const API = "https://api.telegram.org";

export const telegramEnabled = () =>
  !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_BOT_USERNAME;

// ───────── ลิงก์ผูกบัญชี: https://t.me/<bot>?start=<code> ─────────
// code = uuid สมาชิก (ไม่มีขีด 32 ตัว) + "_" + ลายเซ็น 16 ตัว → ไม่ต้องมีตารางเก็บโค้ด
function sign(hex: string): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("ต้องตั้ง SESSION_SECRET");
  return createHmac("sha256", s).update(`tg:${hex}`).digest("base64url").slice(0, 16);
}

export function linkCode(memberId: string): string {
  const hex = memberId.replace(/-/g, "");
  return `${hex}_${sign(hex)}`;
}

export function parseLinkCode(code: string): string | null {
  if (code.length !== 49 || code[32] !== "_") return null;
  const hex = code.slice(0, 32);
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  const a = Buffer.from(code.slice(33));
  const b = Buffer.from(sign(hex));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ───────── ส่งข้อความ ─────────
export async function tgSend(
  chatId: number | string,
  text: string,
  token?: string,
): Promise<"ok" | "blocked" | "error"> {
  const activeToken = token || process.env.TELEGRAM_BOT_TOKEN;
  if (!activeToken) return "error";
  try {
    const res = await fetch(`${API}/bot${activeToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return "ok";
    return res.status === 403 ? "blocked" : "error"; // 403 = ผู้ใช้บล็อกบอท/ลบแชท
  } catch {
    return "error";
  }
}

export type NotifyItem = { name: string; emoji: string; quantity: number; unit: string; note: string };

function toCleanEmoji(emoji?: string | null): string {
  if (!emoji) return "🛒";
  if (emoji.startsWith("/") || emoji.startsWith("http")) return "🌿";
  return emoji;
}

export function buildOrderMessage(
  sender: { name: string; avatar: string },
  items: NotifyItem[],
  appUrl?: string,
  now: Date = new Date(),
  orderNo?: string | null,
): string {
  const MAX = 40;
  const itemLines = items.slice(0, MAX).map((i) => {
    const icon = toCleanEmoji(i.emoji);
    const main = `${icon} ${i.name} × ${fmtQty(i.quantity)} ${i.unit}`;
    return i.note?.trim() ? `${main} (${i.note.trim()})` : main;
  });

  const more = items.length > MAX ? `\n…และอีก ${items.length - MAX} รายการ` : "";

  const timeStr = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
    hour12: false,
  }).format(now);

  const link = appUrl ? `\n\n👉 ${appUrl.replace(/\/$/, "")}/list` : "";

  const orderPrefix = orderNo ? ` #${orderNo}` : "";
  const title = sender.name && sender.name !== "บ้านเรา"
    ? `🛒 ${sender.name}สั่งของ${orderPrefix}`
    : `🛒 มีรายการสั่งของเข้าบ้าน${orderPrefix}`;

  return [
    title,
    "",
    ...itemLines,
    more,
    "",
    `📋 รวม ${items.length} รายการ`,
    "",
    `เวลา: ${timeStr}`,
  ].filter(Boolean).join("\n") + link;
}

/** สร้างข้อความแจ้งเตือนเมื่อแก้ไขรายการ */
export function buildEditMessage(
  orderNo: string | null,
  item: { name: string; emoji: string; unit: string },
  fromQty: number,
  toQty: number,
  isPurchased: boolean,
  note?: string | null,
): string {
  const icon = toCleanEmoji(item.emoji);
  const orderPrefix = orderNo ? `#${orderNo} ` : "";
  const purchasedTag = isPurchased ? " (ซื้อไปแล้ว)" : "";
  const noteSuffix = note?.trim() ? ` (${note.trim()})` : "";
  
  if (fromQty !== toQty) {
    return `✏️ ${orderPrefix}แก้รายการ${purchasedTag} ${icon} ${item.name} × ${fmtQty(fromQty)} → ${fmtQty(toQty)} ${item.unit}${noteSuffix}`;
  }
  return `✏️ ${orderPrefix}แก้รายการ${purchasedTag} ${icon} ${item.name}${noteSuffix}`;
}

/** สร้างข้อความแจ้งเตือนเมื่อเอาของออก */
export function buildRemoveMessage(
  orderNo: string | null,
  item: { name: string; emoji: string; unit: string; quantity: number },
  isPurchased: boolean,
): string {
  const icon = toCleanEmoji(item.emoji);
  const orderPrefix = orderNo ? `#${orderNo} ` : "";
  const purchasedTag = isPurchased ? " (ซื้อไปแล้ว)" : "";
  return `🗑 ${orderPrefix}เอาออก${purchasedTag} ${icon} ${item.name} × ${fmtQty(item.quantity)} ${item.unit}`;
}

/** สร้างข้อความแจ้งเตือนเมื่อยกเลิกออเดอร์ทั้งใบ */
export function buildCancelOrderMessage(
  orderNo: string | null,
  items: { name: string; emoji: string; quantity: number; unit: string; is_purchased?: boolean }[],
): string {
  const orderTag = orderNo ? ` #${orderNo}` : "";
  const title = `❌ ยกเลิกออเดอร์${orderTag} ไม่ต้องซื้อแล้ว`;

  const MAX = 40;
  const itemLines = items.slice(0, MAX).map((i) => {
    const icon = toCleanEmoji(i.emoji);
    return `• ${icon} ${i.name} × ${fmtQty(i.quantity)} ${i.unit}`;
  });

  const more = items.length > MAX ? `…และอีก ${items.length - MAX} รายการ` : "";

  const purchased = items.filter((i) => i.is_purchased);
  const purchasedLine = purchased.length > 0
    ? `⚠️ ซื้อไปแล้ว ${purchased.length} รายการ: ${purchased.map((p) => p.name).join(", ")}`
    : "";

  return [
    title,
    "",
    "รายการในใบ:",
    ...itemLines,
    more,
    "",
    purchasedLine,
  ].filter(Boolean).join("\n");
}

// ───────── Webhook Management ─────────
export type WebhookInfo = {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
};

export async function tgGetWebhookInfo(token: string): Promise<{ ok: boolean; info?: WebhookInfo; error?: string }> {
  try {
    const res = await fetch(`${API}/bot${token}/getWebhookInfo`, {
      method: "GET",
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && data?.result) {
      return { ok: true, info: data.result as WebhookInfo };
    }
    return { ok: false, error: data?.description || "ไม่สามารถดึงข้อมูล Webhook ได้" };
  } catch {
    return { ok: false, error: "ไม่สามารถเชื่อมต่อกับ Telegram API ได้" };
  }
}

export async function tgSetWebhook(
  token: string,
  webhookUrl: string,
  secretToken: string,
): Promise<{ ok: boolean; description?: string }> {
  try {
    const res = await fetch(`${API}/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secretToken,
        drop_pending_updates: false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      return { ok: true, description: data.description };
    }
    return { ok: false, description: data?.description || "ไม่สามารถตั้งค่า Webhook ได้" };
  } catch {
    return { ok: false, description: "ไม่สามารถเชื่อมต่อกับ Telegram API ได้" };
  }
}

/** ส่งข้อความหาทุกคนที่ผูกไว้ — เรียกผ่าน after() หลังตอบผู้ใช้แล้ว */
export async function notifyOthers(
  familyId: string,
  text: string,
  botToken?: string,
): Promise<void> {
  try {
    const recipientList: Array<{ id: string; chat_id: number; isRecipientTable: boolean }> = [];

    // 1. ดึงจาก family_members เสมอ (ที่ผูกผ่าน Telegram /start หรือ /notify)
    try {
      let { data: members, error } = await db()
        .from("family_members")
        .select("id,telegram_chat_id,telegram_notifications_enabled")
        .eq("family_id", familyId)
        .not("telegram_chat_id", "is", null);

      if (error && (error.code === "42703" || error.code === "PGRST204")) {
        const fallback = await db()
          .from("family_members")
          .select("id,telegram_chat_id")
          .eq("family_id", familyId)
          .not("telegram_chat_id", "is", null);
        members = (fallback.data ?? []).map((r) => ({ ...r, telegram_notifications_enabled: true }));
      }

      if (members && members.length > 0) {
        for (const m of members) {
          if ((m as Record<string, unknown>).telegram_notifications_enabled !== false && m.telegram_chat_id) {
            recipientList.push({
              id: m.id as string,
              chat_id: Number(m.telegram_chat_id),
              isRecipientTable: false,
            });
          }
        }
      }
    } catch (err) {
      console.error("Error reading family_members recipients:", err);
    }

    // 2. ดึงจากตาราง telegram_recipients เพิ่มเติม (ถ้ามีตารางนี้ในฐานข้อมูล)
    try {
      const { data: recs, error } = await db()
        .from("telegram_recipients")
        .select("id,chat_id,enabled")
        .eq("family_id", familyId)
        .eq("enabled", true);

      if (!error && recs && recs.length > 0) {
        for (const r of recs) {
          if (r.chat_id) {
            recipientList.push({
              id: r.id as string,
              chat_id: Number(r.chat_id),
              isRecipientTable: true,
            });
          }
        }
      }
    } catch {
      // ข้ามหากตาราง telegram_recipients ยังไม่มี
    }

    if (!recipientList.length) return;

    // กรองเอาเฉพาะ chat_id ที่ไม่ซ้ำกัน
    const uniqueChatMap = new Map<number, { id: string; isRecipientTable: boolean }>();
    for (const r of recipientList) {
      if (r.chat_id && !uniqueChatMap.has(r.chat_id)) {
        uniqueChatMap.set(r.chat_id, { id: r.id, isRecipientTable: r.isRecipientTable });
      }
    }

    await Promise.all(
      Array.from(uniqueChatMap.entries()).map(async ([chatId, info]) => {
        const result = await tgSend(chatId, text, botToken);
        if (result === "blocked") {
          if (info.isRecipientTable) {
            await db().from("telegram_recipients").update({ enabled: false }).eq("id", info.id);
          } else {
            await db().from("family_members").update({ telegram_chat_id: null }).eq("id", info.id);
          }
        }
      }),
    );
  } catch (err) {
    console.error("notifyOthers error:", err);
  }
}

/** สั่งของ: แจ้งเตือนทุกคนที่ผูก Telegram ไว้ */
export async function notifyBuyers(
  familyId: string,
  sender: { id: string; name: string; avatar: string },
  sent: { productId: string; quantity: number; note: string }[],
  botToken?: string,
  orderNo?: string | null,
): Promise<void> {
  try {
    let prods: Array<{ id: string; name: string; emoji: string; unit: string; icon?: string }> = [];
    const resWithIcon = await db()
      .from("products")
      .select("id,name,emoji,icon,unit")
      .eq("family_id", familyId)
      .in("id", sent.map((s) => s.productId));

    if (resWithIcon.data) {
      prods = resWithIcon.data as typeof prods;
    } else {
      const resBasic = await db()
        .from("products")
        .select("id,name,emoji,unit")
        .eq("family_id", familyId)
        .in("id", sent.map((s) => s.productId));
      prods = (resBasic.data ?? []) as typeof prods;
    }

    const byId = new Map((prods ?? []).map((p) => [p.id as string, p]));
    const items: NotifyItem[] = sent.flatMap((s) => {
      const p = byId.get(s.productId);
      return p
        ? [{
            name: p.name,
            emoji: p.icon || p.emoji,
            unit: p.unit,
            quantity: s.quantity,
            note: s.note.trim(),
          }]
        : [];
    });
    if (items.length === 0) return;
    await notifyOthers(familyId, buildOrderMessage(sender, items, process.env.APP_URL, new Date(), orderNo), botToken);
  } catch {
    /* ดู notifyOthers */
  }
}

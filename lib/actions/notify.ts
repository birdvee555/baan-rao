"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "../auth";
import { db } from "../db";
import { tgSend } from "../telegram";
import {
  getFamilyTelegramConfig,
  saveFamilyTelegramSettings,
  toggleFamilyTelegramEnabled,
} from "../telegram-config";

/** บันทึกหรือแก้ไขการตั้งค่า Telegram Bot ของครอบครัว */
export async function saveTelegramSettings(
  token: string,
  username: string
): Promise<{ ok: boolean; error?: string }> {
  const { family } = await requireMember();
  const res = await saveFamilyTelegramSettings(family.id, token, username);
  if (!res.ok) {
    return { ok: false, error: res.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
  revalidatePath("/notify");
  return { ok: true };
}

/** เปิด/ปิดการแจ้งเตือน Telegram ระดับครอบครัว */
export async function toggleFamilyTelegram(
  enabled: boolean
): Promise<{ ok: boolean }> {
  const { family } = await requireMember();
  const res = await toggleFamilyTelegramEnabled(family.id, enabled);
  revalidatePath("/notify");
  return res;
}

/** ยกเลิกการเชื่อม Telegram ของสมาชิกที่ใช้เครื่องนี้ */
export async function disconnectTelegram(): Promise<void> {
  const { member, family } = await requireMember();
  await db()
    .from("family_members")
    .update({ telegram_chat_id: null, telegram_username: null })
    .eq("id", member.id)
    .eq("family_id", family.id);
  revalidatePath("/notify");
}

/** เปิด/ปิดการรับแจ้งเตือน Telegram ของตนเอง */
export async function toggleNotifications(enabled: boolean): Promise<void> {
  const { member, family } = await requireMember();
  const res = await db()
    .from("family_members")
    .update({ telegram_notifications_enabled: enabled })
    .eq("id", member.id)
    .eq("family_id", family.id);

  if (res.error && res.error.code === "42703") {
    // คอลัมน์ telegram_notifications_enabled ยังไม่มีใน DB ให้ข้ามไป
  }
  revalidatePath("/notify");
}

/** ส่งข้อความทดสอบ */
export async function sendTestNotification(): Promise<{ ok: boolean; error?: string }> {
  const { member, family } = await requireMember();

  const config = await getFamilyTelegramConfig(family.id);
  if (!config.isConfigured || !config.botToken) {
    return {
      ok: false,
      error: "ยังไม่ได้ตั้งค่า Bot Token กรุณาบันทึกการตั้งค่าด้านบนก่อน",
    };
  }

  const { data: m } = await db()
    .from("family_members")
    .select("telegram_chat_id,name")
    .eq("id", member.id)
    .eq("family_id", family.id)
    .maybeSingle();

  if (!m?.telegram_chat_id) {
    return {
      ok: false,
      error: "คุณยังไม่ได้เชื่อมต่อ Telegram กรุณากดเชื่อมต่อด้านล่างก่อน",
    };
  }

  const msg = `🔔 ทดสอบการแจ้งเตือน\n\n"บ้านเราซื้ออะไร" เชื่อมต่อ Telegram สำเร็จแล้ว 💚\n(สำหรับ ${m.name})`;
  const res = await tgSend(m.telegram_chat_id as number, msg, config.botToken);

  if (res === "ok") {
    return { ok: true };
  } else if (res === "blocked") {
    await db().from("family_members").update({ telegram_chat_id: null }).eq("id", member.id);
    revalidatePath("/notify");
    return { ok: false, error: "บอทถูกบล็อกหรือแชทถูกลบ กรุณากดเปิดแชทกับบอทใหม่อีกครั้ง" };
  } else {
    return { ok: false, error: "ไม่สามารถส่งข้อความได้ กรุณาตรวจสอบการตั้งค่า Bot Token" };
  }
}

export type WebhookStatusResult = {
  ok: boolean;
  isConfigured: boolean;
  appUrlConfigured: boolean;
  isHttps: boolean;
  hasWebhookSecret: boolean;
  expectedUrl: string;
  info?: {
    url: string;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
  };
  error?: string;
};

/** ดึงสถานะ Webhook ปัจจุบันของบอท */
export async function getTelegramWebhookStatusAction(): Promise<WebhookStatusResult> {
  const { family } = await requireMember();
  const config = await getFamilyTelegramConfig(family.id);

  const appUrl = (process.env.APP_URL || "").trim().replace(/\/$/, "");
  const isHttps = appUrl.startsWith("https://");
  const hasWebhookSecret = !!process.env.TELEGRAM_WEBHOOK_SECRET;
  const expectedUrl = appUrl ? `${appUrl}/api/telegram` : "";

  if (!config.isConfigured || !config.botToken) {
    return {
      ok: false,
      isConfigured: false,
      appUrlConfigured: !!appUrl,
      isHttps,
      hasWebhookSecret,
      expectedUrl,
      error: "ยังไม่ได้ตั้งค่า Bot Token กรุณาบันทึกการตั้งค่าด้านบนก่อน",
    };
  }

  const { tgGetWebhookInfo } = await import("../telegram");
  const res = await tgGetWebhookInfo(config.botToken);

  if (!res.ok) {
    return {
      ok: false,
      isConfigured: true,
      appUrlConfigured: !!appUrl,
      isHttps,
      hasWebhookSecret,
      expectedUrl,
      error: res.error,
    };
  }

  return {
    ok: true,
    isConfigured: true,
    appUrlConfigured: !!appUrl,
    isHttps,
    hasWebhookSecret,
    expectedUrl,
    info: res.info,
  };
}

/** ตั้งค่า Webhook ไปยัง Telegram API */
export async function setTelegramWebhookAction(): Promise<{ ok: boolean; message?: string; error?: string }> {
  const { family } = await requireMember();
  const config = await getFamilyTelegramConfig(family.id);

  if (!config.isConfigured || !config.botToken) {
    return { ok: false, error: "ยังไม่ได้ตั้งค่า Bot Token" };
  }

  const appUrl = (process.env.APP_URL || "").trim().replace(/\/$/, "");
  if (!appUrl || !appUrl.startsWith("https://")) {
    return {
      ok: false,
      error: "APP_URL ต้องเป็น HTTPS (เช่น https://your-app.vercel.app) webhook จะทำงานได้หลัง Deploy เท่านั้น",
    };
  }

  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secretToken || secretToken.length < 8) {
    return {
      ok: false,
      error: "ต้องกำหนด TELEGRAM_WEBHOOK_SECRET ใน Environment Variables ก่อน (ความยาวอย่างน้อย 8-10 ตัวอักษร)",
    };
  }

  const webhookUrl = `${appUrl}/api/telegram`;
  const { tgSetWebhook } = await import("../telegram");
  const res = await tgSetWebhook(config.botToken, webhookUrl, secretToken);

  if (!res.ok) {
    return { ok: false, error: res.description || "ตั้งค่า Webhook ไม่สำเร็จ" };
  }

  revalidatePath("/notify");
  return { ok: true, message: "ตั้งค่า Webhook สำเร็จเรียบร้อย" };
}

// ───────── ผู้รับแจ้งเตือนหลายคน (Multi-recipients) ─────────
import crypto from "crypto";

export type RecipientItem = {
  id: string;
  chatId: number;
  label: string;
  enabled: boolean;
  createdAt: string;
};

/** ดึงรายชื่อผู้รับทั้งหมดของครอบครัว */
export async function getRecipientsAction(): Promise<RecipientItem[]> {
  const { family } = await requireMember();
  try {
    const { data, error } = await db()
      .from("telegram_recipients")
      .select("id,chat_id,label,enabled,created_at")
      .eq("family_id", family.id)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data.map((r) => ({
      id: r.id as string,
      chatId: Number(r.chat_id),
      label: (r.label as string) || "ผู้รับ",
      enabled: Boolean(r.enabled),
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
  }
}

/** เปิด/ปิด การรับแจ้งเตือนของผู้รับรายบุคคล */
export async function toggleRecipientAction(id: string, enabled: boolean): Promise<{ ok: boolean }> {
  const { family } = await requireMember();
  await db()
    .from("telegram_recipients")
    .update({ enabled })
    .eq("id", id)
    .eq("family_id", family.id);

  revalidatePath("/notify");
  return { ok: true };
}

/** ลบผู้รับ */
export async function deleteRecipientAction(id: string): Promise<{ ok: boolean }> {
  const { family } = await requireMember();
  await db()
    .from("telegram_recipients")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);

  revalidatePath("/notify");
  return { ok: true };
}

/** สร้าง Signed Link สำหรับส่งให้อีกคนกด START */
export async function generateAddRecipientLinkAction(label: string): Promise<{ ok: boolean; link?: string; error?: string }> {
  const { family } = await requireMember();
  const config = await getFamilyTelegramConfig(family.id);
  if (!config.isConfigured || !config.botUsername) {
    return { ok: false, error: "ยังไม่ได้ตั้งค่า Bot Username กรุณาบันทึกการตั้งค่าบอทก่อน" };
  }

  const cleanLabel = (label || "คนในบ้าน").trim().slice(0, 30);
  const secret = process.env.SESSION_SECRET || "fallback-secret-baan-rao-32";
  const dataToSign = `${family.id}:${cleanLabel}`;
  const sig = crypto.createHmac("sha256", secret).update(dataToSign).digest("hex").slice(0, 16);

  const payloadObj = { f: family.id, l: cleanLabel, s: sig };
  const payloadStr = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const startCode = `rec_${payloadStr}`;

  const cleanUsername = config.botUsername.replace(/^@/, "");
  const link = `https://t.me/${cleanUsername}?start=${startCode}`;
  return { ok: true, link };
}

/** ดึง getUpdates เพื่อผูกผู้รับใหม่ตามข้อตกลง (เช็กลายเซ็นด้วย SESSION_SECRET) */
export async function syncRecipientsViaGetUpdatesAction(): Promise<{ ok: boolean; count: number; error?: string }> {
  const { family } = await requireMember();
  const config = await getFamilyTelegramConfig(family.id);
  if (!config.isConfigured || !config.botToken) {
    return { ok: false, count: 0, error: "ยังไม่ได้ตั้งค่า Bot Token" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/getUpdates?limit=50`, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!res.ok || !data.ok || !Array.isArray(data.result)) {
      return { ok: false, count: 0, error: data.description || "ไม่สามารถเชื่อมต่อ Telegram ได้" };
    }

    const secret = process.env.SESSION_SECRET || "fallback-secret-baan-rao-32";
    let addedCount = 0;

    for (const update of data.result) {
      const msg = update.message;
      const text = String(msg?.text || "").trim();
      const chatId = msg?.chat?.id;

      if (!text.startsWith("/start rec_") || typeof chatId !== "number") continue;

      try {
        const rawPayload = text.slice(11).trim();
        const jsonStr = Buffer.from(rawPayload, "base64url").toString("utf8");
        const parsed = JSON.parse(jsonStr);

        // ตรวจสอบความถูกต้องของ signature
        const expectedSig = crypto
          .createHmac("sha256", secret)
          .update(`${parsed.f}:${parsed.l}`)
          .digest("hex")
          .slice(0, 16);

        if (parsed.s !== expectedSig) {
          // ลายเซ็นไม่ถูกต้อง ข้าม
          continue;
        }

        // ถ้าเป็นของครอบครัวนี้
        if (parsed.f === family.id) {
          const label = String(parsed.l || "คนในบ้าน").slice(0, 40);

          const { error: insErr } = await db()
            .from("telegram_recipients")
            .upsert(
              {
                family_id: family.id,
                chat_id: chatId,
                label,
                enabled: true,
              },
              { onConflict: "chat_id" }
            );

          if (!insErr) {
            addedCount++;
            // ส่งข้อความต้อนรับ
            await tgSend(
              chatId,
              `เชื่อมต่อการแจ้งเตือนสำเร็จแล้ว 💚\nคุณจะได้รับแจ้งเตือนเมื่อมีคนในบ้านสั่งของ`,
              config.botToken
            );
          }
        }
      } catch {
        // ข้าม payload ที่ถอดรหัสไม่ได้
      }
    }

    revalidatePath("/notify");
    return { ok: true, count: addedCount };
  } catch (err: unknown) {
    return { ok: false, count: 0, error: (err as Error).message || "เกิดข้อผิดพลาดในการตรวจสอบ" };
  }
}


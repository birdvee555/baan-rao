import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { db } from "./db";

const ALGORITHM = "aes-256-gcm";
const API = "https://api.telegram.org";

/**
 * ดึง Encryption Key จาก TELEGRAM_ENCRYPTION_KEY เท่านั้น
 * ห้าม fallback เป็น hardcoded string เพื่อความปลอดภัย
 */
function getKey(): Buffer {
  const secret = process.env.TELEGRAM_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า TELEGRAM_ENCRYPTION_KEY ใน Environment Variables (ยาวอย่างน้อย 16 ตัวอักษร)"
    );
  }
  return scryptSync(secret, "baan-rao-tg-salt", 32);
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const key = getKey();
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plain, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptToken(cipherText: string): string | null {
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getKey();
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return null;
  }
}

export function maskToken(token: string): string {
  if (!token) return "";
  const trimmed = token.trim();
  if (trimmed.length <= 6) return "••••••";
  const last4 = trimmed.slice(-4);
  return `••••••••••••${last4}`;
}

export type FamilyTelegramConfig = {
  botToken: string | null;
  botUsername: string | null;
  maskedToken: string | null;
  isEnabled: boolean;
  isConfigured: boolean;
  source: "db" | "env" | "none";
  errorMessage?: string;
};

/** ดึงการตั้งค่า Telegram ของครอบครัวจากตาราง telegram_settings เท่านั้น */
export async function getFamilyTelegramConfig(familyId: string): Promise<FamilyTelegramConfig> {
  try {
    const { data: dbSetting, error } = await db()
      .from("telegram_settings")
      .select("bot_username,bot_token_encrypted,is_enabled")
      .eq("family_id", familyId)
      .maybeSingle();

    if (error && error.code === "PGRST205") {
      return {
        botToken: null,
        botUsername: null,
        maskedToken: null,
        isEnabled: false,
        isConfigured: false,
        source: "none",
        errorMessage: "ต้องรัน 009_telegram_settings.sql ก่อน",
      };
    }

    if (!error && dbSetting) {
      let decrypted: string | null = null;
      try {
        decrypted = dbSetting.bot_token_encrypted ? decryptToken(dbSetting.bot_token_encrypted) : null;
      } catch (keyErr) {
        return {
          botToken: null,
          botUsername: dbSetting.bot_username || null,
          maskedToken: "••••••••••••",
          isEnabled: dbSetting.is_enabled !== false,
          isConfigured: false,
          source: "db",
          errorMessage: "ไม่สามารถถอดรหัส Token ได้ ตรวจสอบว่า TELEGRAM_ENCRYPTION_KEY ตรงกับที่เคยบันทึกไว้",
        };
      }

      if (decrypted) {
        return {
          botToken: decrypted,
          botUsername: dbSetting.bot_username || null,
          maskedToken: maskToken(decrypted),
          isEnabled: dbSetting.is_enabled !== false,
          isConfigured: true,
          source: "db",
        };
      }
    }
  } catch (err) {
    console.error("Error reading telegram config from DB:", err);
  }

  // Fallback: ใช้ Environment Variables ถ้ามี
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const raw = process.env.TELEGRAM_BOT_TOKEN;
    return {
      botToken: raw,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
      maskedToken: maskToken(raw),
      isEnabled: true,
      isConfigured: true,
      source: "env",
    };
  }

  return {
    botToken: null,
    botUsername: null,
    maskedToken: null,
    isEnabled: false,
    isConfigured: false,
    source: "none",
  };
}

/** ตรวจสอบความถูกต้องของ Bot Token กับ Telegram Bot API */
export async function verifyBotToken(token: string): Promise<{ ok: boolean; username?: string; error?: string }> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { ok: false, error: "กรุณากรอก Bot Token" };
  }

  try {
    const res = await fetch(`${API}/bot${cleanToken}/getMe`, {
      method: "GET",
      signal: AbortSignal.timeout(6000),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && data?.result) {
      return { ok: true, username: data.result.username ? `@${data.result.username}` : undefined };
    }

    return { ok: false, error: "Bot Token ไม่ถูกต้อง หรือไม่สามารถเชื่อมต่อกับ Telegram ได้" };
  } catch {
    return { ok: false, error: "ไม่สามารถเชื่อมต่อกับ Telegram Bot API ได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

/** บันทึกการตั้งค่า Telegram ของครอบครัวลงตาราง telegram_settings */
export async function saveFamilyTelegramSettings(
  familyId: string,
  rawToken: string,
  rawUsername: string,
): Promise<{ ok: boolean; username?: string; maskedToken?: string; error?: string }> {
  const cleanToken = rawToken.trim();
  let cleanUsername = rawUsername.trim();
  if (cleanUsername && !cleanUsername.startsWith("@")) {
    cleanUsername = `@${cleanUsername}`;
  }

  // ตรวจสอบ TELEGRAM_ENCRYPTION_KEY ก่อน
  if (!process.env.TELEGRAM_ENCRYPTION_KEY) {
    return {
      ok: false,
      error: "ยังไม่ได้ตั้งค่า TELEGRAM_ENCRYPTION_KEY ใน Environment Variables บน Vercel",
    };
  }

  // 1. ตรวจสอบ Bot Token กับ Telegram
  const verify = await verifyBotToken(cleanToken);
  if (!verify.ok) {
    return { ok: false, error: verify.error };
  }

  const finalUsername = cleanUsername || verify.username || "";
  let encrypted: string;
  try {
    encrypted = encryptToken(cleanToken);
  } catch (encErr) {
    return {
      ok: false,
      error: "ไม่สามารถเข้ารหัส Bot Token ได้ ตรวจสอบค่า TELEGRAM_ENCRYPTION_KEY",
    };
  }

  try {
    // 2. บันทึกลงตาราง telegram_settings
    const { error } = await db()
      .from("telegram_settings")
      .upsert(
        {
          family_id: familyId,
          bot_username: finalUsername,
          bot_token_encrypted: encrypted,
          is_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "family_id" }
      );

    if (error) {
      if (error.code === "PGRST205") {
        return { ok: false, error: "ต้องรัน 009_telegram_settings.sql ก่อน" };
      }
      return { ok: false, error: "ไม่สามารถบันทึกการตั้งค่าลงฐานข้อมูลได้" };
    }

    return { ok: true, username: finalUsername, maskedToken: maskToken(cleanToken) };
  } catch (err) {
    console.error("Save telegram error:", err);
    return { ok: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}

/** เปิด/ปิดการใช้งาน Telegram ของครอบครัว */
export async function toggleFamilyTelegramEnabled(
  familyId: string,
  enabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await db()
      .from("telegram_settings")
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("family_id", familyId);

    if (error) {
      if (error.code === "PGRST205") {
        return { ok: false, error: "ต้องรัน 009_telegram_settings.sql ก่อน" };
      }
      return { ok: false, error: "ไม่สามารถอัปเดตสถานะได้" };
    }
  } catch (err) {
    console.error("Toggle error:", err);
    return { ok: false, error: "เกิดข้อผิดพลาด" };
  }
  return { ok: true };
}

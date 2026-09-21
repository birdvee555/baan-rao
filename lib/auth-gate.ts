import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";

export const AUTH_COOKIE_NAME = "baan_auth";

/**
 * ดึง SESSION_SECRET สำหรับสร้างและตรวจสอบ HMAC Token
 */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("ต้องตั้งค่า SESSION_SECRET ใน Environment Variables (ยาวอย่างน้อย 16 ตัวอักษร)");
  }
  return secret;
}

/**
 * คำนวณ HMAC-SHA256 Token จาก hash ของ APP_PASSWORD
 * เมื่อเปลี่ยน APP_PASSWORD ค่า Token จะเปลี่ยนทันที ทำให้คุกกี้เดิมใช้ไม่ได้
 */
export function getExpectedAuthToken(): string | null {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return null;
  const passwordHash = createHash("sha256").update(appPassword).digest("hex");
  return createHmac("sha256", getSessionSecret()).update(passwordHash).digest("hex");
}

/**
 * ตรวจสอบว่าผู้ใช้ผ่านการปลดล็อกระบบแล้วหรือไม่
 * - บน Production: หากไม่ได้ตั้ง APP_PASSWORD ต้องปฏิเสธทุกหน้าพร้อมข้อความชัดเจน
 * - บน Development: หากไม่ได้ตั้ง APP_PASSWORD ให้อนุญาตเปิดโล่งตามเดิม
 * - หากตั้ง APP_PASSWORD: ต้องมีคุกกี้ baan_auth ที่ตรงกับ expected token
 */
export async function verifyAppUnlocked(): Promise<boolean> {
  const isProd = process.env.NODE_ENV === "production";
  const appPassword = process.env.APP_PASSWORD;

  if (isProd && !appPassword) {
    throw new Error(
      "ระบบยังไม่ได้ตั้งค่า APP_PASSWORD บน Production (กรุณาตั้งค่าใน Environment Variables บน Vercel ห้ามเปิดโล่ง)"
    );
  }

  if (!appPassword) {
    // Development mode ที่ไม่ได้ตั้งรหัสผ่าน -> อนุญาตให้เข้าใช้งานได้
    return true;
  }

  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!authCookie) return false;

  const expected = getExpectedAuthToken();
  if (!expected) return false;

  const bufA = Buffer.from(authCookie);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA, bufB);
}

/**
 * ยืนยันสิทธิ์การเข้าถึงสำหรับ requireMember()
 * หากไม่ผ่านการยืนยันตัวตน จะ redirect ไปยัง /unlock ทันที
 */
export async function assertAuthorized(): Promise<void> {
  const isUnlocked = await verifyAppUnlocked();
  if (!isUnlocked) {
    redirect("/unlock");
  }
}

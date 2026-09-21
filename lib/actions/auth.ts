"use server";

import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, getExpectedAuthToken } from "../auth-gate";

export type UnlockResult = { ok: true } | { ok: false; error: string };

/**
 * ยืนยันรหัสผ่านเพื่อปลดล็อกแอป
 */
export async function unlockApp(password: string): Promise<UnlockResult> {
  const isProd = process.env.NODE_ENV === "production";
  const appPassword = process.env.APP_PASSWORD;

  if (isProd && !appPassword) {
    return {
      ok: false,
      error: "ระบบยังไม่ได้ตั้งค่า APP_PASSWORD บน Production (กรุณาตั้งค่าใน Environment Variables)",
    };
  }

  if (!appPassword) {
    // Development mode และไม่ได้ตั้งรหัสผ่าน
    return { ok: true };
  }

  const cleanInput = String(password ?? "");

  // Hash ทั้งสองฝั่งเป็น SHA-256 ก่อนเทียบ เพื่อให้ Buffer มีความยาวเท่ากันเสมอ
  const inputHash = createHash("sha256").update(cleanInput).digest();
  const targetHash = createHash("sha256").update(appPassword).digest();

  const isMatch = timingSafeEqual(inputHash, targetHash);
  if (!isMatch) {
    // รหัสผิด: หน่วงเวลา ~700ms เพื่อป้องกัน Brute-force
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { ok: false, error: "รหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง" };
  }

  const token = getExpectedAuthToken();
  if (!token) {
    return { ok: false, error: "ไม่สามารถสร้าง Auth Token ได้" };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 ปี
  });

  return { ok: true };
}

/**
 * ล็อกเครื่องนี้: ลบคุกกี้และนำกลับไปหน้า /unlock
 */
export async function lockApp(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/unlock");
}

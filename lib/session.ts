import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const NAME = "baan_session";

/** f = family id, m = member id (เครื่องนี้คือใคร) */
export type Session = { f: string; m?: string };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("ต้องตั้ง SESSION_SECRET (ยาวอย่างน้อย 16 ตัวอักษร)");
  return s;
}

function mac(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(NAME)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(mac(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof p.f !== "string") return null;
    return { f: p.f, m: typeof p.m === "string" ? p.m : undefined };
  } catch {
    return null;
  }
}

export async function setSession(s: Session): Promise<void> {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  (await cookies()).set(NAME, `${body}.${mac(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(NAME);
}

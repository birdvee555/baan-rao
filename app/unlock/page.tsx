import { redirect } from "next/navigation";
import { verifyAppUnlocked } from "@/lib/auth-gate";
import UnlockForm from "./UnlockForm";

export const dynamic = "force-dynamic";

export default async function UnlockPage() {
  const isProd = process.env.NODE_ENV === "production";
  const appPassword = process.env.APP_PASSWORD;

  // หากเป็น Production แล้วยังไม่ได้ตั้ง APP_PASSWORD ห้ามเปิดโล่งเด็ดขาด
  const isMissingProdConfig = isProd && !appPassword;

  // หากปลดล็อกอยู่แล้ว ให้พาไปหน้าแรกทันที
  if (!isMissingProdConfig) {
    const unlocked = await verifyAppUnlocked();
    if (unlocked) {
      redirect("/");
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* กล่องหัวเรื่อง */}
        <div className="mb-6 text-center">
          <span className="inline-block text-5xl">🔐</span>
          <h1 className="mt-3 text-2xl font-bold text-ink">บ้านเราซื้ออะไร</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {isMissingProdConfig
              ? "ระบบต้องการการตั้งค่าความปลอดภัย"
              : "กรุณาใส่รหัสผ่านเพื่อเข้าใช้งาน"}
          </p>
        </div>

        {isMissingProdConfig ? (
          <div className="rounded-3xl border-2 border-rose-ink/30 bg-rose-soft/80 p-5 text-center text-sm font-semibold text-rose-ink shadow-sm">
            <p className="text-base font-bold">⚠️ ยังไม่ได้ตั้งค่ารหัสผ่าน</p>
            <p className="mt-2 text-xs leading-relaxed text-rose-ink/90">
              บน Production ต้องตั้งค่า Environment Variable{" "}
              <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[11px]">
                APP_PASSWORD
              </code>{" "}
              บน Vercel ก่อน จึงจะสามารถเปิดใช้งานได้
            </p>
          </div>
        ) : (
          <div className="rounded-3xl border border-mint-200 bg-white p-6 shadow-sm">
            <UnlockForm />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-ink-soft/70">
          ระบบความปลอดภัยสำหรับใช้งานภายในบ้าน
        </p>
      </div>
    </main>
  );
}

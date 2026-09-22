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
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 py-8">
      {/* ── แสงและวงกลมพาสเทลตกแต่งพื้นหลัง ── */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-mint-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-100/40 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full bg-amber-50/60 blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* ── ส่วนหัวเรื่องและโลโก้ครอบครัว ── */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative">
            <img
              src="/logo.jpg"
              alt="บ้านต้นไผ่ & ใบหลิว"
              className="h-20 w-20 rounded-3xl border-3 border-mint-200 object-cover shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 text-2xl drop-shadow">🌿</span>
          </div>

          <h1 className="mt-3.5 text-2xl font-bold text-ink sm:text-3xl">
            🏡 บ้านต้นไผ่ & ใบหลิว
          </h1>
          <p className="mt-1 text-sm font-semibold text-mint-700">
            “ซื้ออะไรดี วันนี้?”
          </p>
          <p className="mt-2 text-xs font-medium text-ink-soft">
            {isMissingProdConfig
              ? "ระบบต้องการการตั้งค่าความปลอดภัย"
              : "กรุณาใส่รหัสผ่านเพื่อเข้าใช้งาน"}
          </p>
        </div>

        {/* ── กล่องฟอร์มปลดล็อก ── */}
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
          <div className="rounded-3xl border-2 border-mint-200/90 bg-white/95 p-6 shadow-md backdrop-blur-sm">
            <UnlockForm />
          </div>
        )}

        {/* ── Footer ล่างสุด ── */}
        <p className="mt-6 text-center text-xs text-ink-soft/70">
          🔒 ระบบความปลอดภัยสำหรับใช้งานภายในครอบครัว
        </p>
      </div>
    </main>
  );
}

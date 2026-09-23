import Link from "next/link";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { lockApp } from "@/lib/actions/auth";
import { requireMember } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireMember();

  return (
    <div className="space-y-6 pt-2">
      {/* ── ปุ่มย้อนกลับไปหน้าหลัก ── */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-mint-200/80 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
        >
          <span className="text-base font-black text-mint-700">←</span>
          <span>หน้าหลัก</span>
        </Link>
      </div>

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-black text-ink">⚙️ ตั้งค่า</h1>
        <p className="mt-1 text-sm font-medium text-ink-soft">
          จัดการทะเบียนสินค้า การแจ้งเตือน และความปลอดภัย
        </p>
      </div>

      {/* ── Cards รายการตั้งค่าสำหรับมือถือ ── */}
      <div className="space-y-3.5">
        {/* เมนูย่อย 1: ทะเบียนสินค้า */}
        <Link
          href="/products"
          className="group flex items-center gap-4 rounded-3xl border-2 border-mint-200/90 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-mint-400 hover:shadow-md active:scale-[0.98] active:bg-mint-50/40"
        >
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-mint-100 to-emerald-100 text-2xl shadow-2xs group-hover:scale-105 transition-transform">
            📦
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink group-hover:text-mint-800 transition-colors">
                ทะเบียนสินค้า
              </h2>
              <span className="text-lg text-mint-600 font-bold opacity-70 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-ink-soft">
              เพิ่ม / แก้ไข / ซ่อนสินค้าในบ้าน
            </p>
          </div>
        </Link>

        {/* เมนูย่อย 2: หมวดหมู่สินค้า */}
        <Link
          href="/categories"
          className="group flex items-center gap-4 rounded-3xl border-2 border-emerald-200/90 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md active:scale-[0.98] active:bg-emerald-50/40"
        >
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-2xl shadow-2xs group-hover:scale-105 transition-transform">
            🏷️
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink group-hover:text-emerald-800 transition-colors">
                หมวดหมู่สินค้า
              </h2>
              <span className="text-lg text-emerald-600 font-bold opacity-70 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-ink-soft">
              เพิ่ม / แก้ไข / ลบหมวดหมู่สินค้าในบ้าน
            </p>
          </div>
        </Link>

        {/* เมนูย่อย 2: Telegram */}
        <Link
          href="/notify"
          className="group flex items-center gap-4 rounded-3xl border-2 border-sky-200/90 bg-white p-4 sm:p-5 shadow-sm transition-all hover:border-sky-400 hover:shadow-md active:scale-[0.98] active:bg-sky-50/40"
        >
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-100 text-2xl shadow-2xs group-hover:scale-105 transition-transform">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink group-hover:text-sky-800 transition-colors">
                Telegram
              </h2>
              <span className="text-lg text-sky-600 font-bold opacity-70 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-ink-soft">
              ตั้งค่าการแจ้งเตือนเมื่อมีคนสั่งของ
            </p>
          </div>
        </Link>

        {/* เมนูย่อย 3: ติดตั้งแอปลงมือถือ */}
        <PwaInstallPrompt mode="card" />
      </div>

      {/* ── ส่วนความปลอดภัย (ออกจากระบบ / ล็อกเครื่อง) ── */}
      <div className="pt-4 border-t border-mint-100">
        <form action={lockApp}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50/60 px-4 py-3 text-sm font-bold text-rose-700 shadow-2xs transition-all hover:bg-rose-100 active:scale-[0.98]"
          >
            <span>🔒</span>
            <span>ล็อกเครื่องนี้ (ออกจากระบบ)</span>
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-ink-soft/70">
          เมื่อกดล็อก จะต้องใส่รหัสผ่านใหม่ในการเข้าใช้งานครั้งถัดไป
        </p>
      </div>
    </div>
  );
}

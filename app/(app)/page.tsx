import Link from "next/link";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import { requireMember } from "@/lib/auth";
import { getActive } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { family } = await requireMember();
  const active = await getActive(family.id);
  const remaining = active.items.filter((i) => !i.is_purchased).length;

  return (
    <div className="space-y-6 pt-2">
      {/* ── Header สไตล์ Family App ── */}
      <header className="flex flex-col items-center text-center space-y-3">
        <div className="relative">
          <img
            src="/logo.jpg"
            alt="บ้านต้นไผ่ & ใบหลิว"
            className="h-20 w-20 rounded-3xl object-cover shadow-md border-3 border-mint-200"
          />
          <span className="absolute -bottom-1 -right-1 text-2xl drop-shadow">🌿</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">
            🏡 {family.name || "บ้านต้นไผ่ & ใบหลิว"}
          </h1>
          <p className="mt-1.5 text-base font-semibold text-mint-700 sm:text-lg">
            “ซื้ออะไรดี วันนี้?”
          </p>
        </div>
      </header>

      {/* ── แบนเนอร์แนะนำติดตั้งแอปลงมือถือ (PWA) ── */}
      <PwaInstallPrompt mode="banner" />

      {/* ── Card แจ้งเตือนรายการที่กำลังซื้ออยู่ (ถ้ามี) ── */}
      {remaining > 0 ? (
        <Link
          href="/list"
          className="group flex items-center justify-between gap-4 rounded-3xl border-2 border-mint-300 bg-gradient-to-r from-mint-50 to-emerald-50/70 p-4 shadow-sm transition-all hover:border-mint-400 hover:shadow-md active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint-200 text-2xl shadow-2xs group-hover:scale-110 transition-transform">
              🧺
            </span>
            <div className="text-left">
              <p className="text-sm font-bold text-ink leading-tight">กำลังซื้ออยู่ {remaining} รายการ</p>
              <p className="text-xs text-ink-soft mt-0.5">แตะเพื่อเปิดโหมดเดินตลาด / ซูเปอร์</p>
            </div>
          </div>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-mint-700 font-bold shadow-2xs group-hover:translate-x-0.5 transition-transform shrink-0">
            ›
          </span>
        </Link>
      ) : null}

      {/* ── 3 เมนูหลัก Cards ขนาดใหญ่สำหรับ Mobile-First ── */}
      <nav aria-label="เมนูหลัก" className="space-y-4">
        {/* เมนูที่ 1: สั่งของ */}
        <Link
          href="/shopping"
          className="group relative flex items-center gap-5 rounded-3xl border-2 border-mint-200/90 bg-white p-5 shadow-sm transition-all hover:border-mint-400 hover:shadow-md active:scale-[0.98] active:bg-mint-50/40"
        >
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-mint-100 to-emerald-100 text-3xl shadow-2xs group-hover:scale-105 transition-transform">
            🛒
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-ink group-hover:text-mint-800 transition-colors">
                สั่งของ
              </h2>
              <span className="text-xl text-mint-600 font-bold opacity-70 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-ink-soft leading-normal">
              เลือกของที่ต้องซื้อ • ค้นหาด่วน
            </p>
          </div>
        </Link>

        {/* เมนูที่ 2: ประวัติการสั่ง */}
        <Link
          href="/history"
          className="group relative flex items-center gap-5 rounded-3xl border-2 border-amber-200/80 bg-white p-5 shadow-sm transition-all hover:border-amber-400 hover:shadow-md active:scale-[0.98] active:bg-amber-50/40"
        >
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-3xl shadow-2xs group-hover:scale-105 transition-transform">
            📋
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-ink group-hover:text-amber-800 transition-colors">
                ประวัติการสั่ง
              </h2>
              <span className="text-xl text-amber-600 font-bold opacity-70 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-ink-soft leading-normal">
              ดูรายการที่เคยสั่ง • สรุปยอด
            </p>
          </div>
        </Link>

        {/* เมนูที่ 3: ตั้งค่า */}
        <Link
          href="/settings"
          className="group relative flex items-center gap-5 rounded-3xl border-2 border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-slate-400 hover:shadow-md active:scale-[0.98] active:bg-slate-50/60"
        >
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-zinc-100 text-3xl shadow-2xs group-hover:scale-105 transition-transform">
            ⚙️
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-ink group-hover:text-slate-800 transition-colors">
                ตั้งค่า
              </h2>
              <span className="text-xl text-slate-500 font-bold opacity-70 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-ink-soft leading-normal">
              Telegram • ทะเบียนสินค้า
            </p>
          </div>
        </Link>
      </nav>
    </div>
  );
}

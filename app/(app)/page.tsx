import Link from "next/link";
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

      {/* ── แถบทางลัดโหมดเดินตลาด (แสดงเมื่อมีของกำลังซื้ออยู่) ── */}
      {remaining > 0 ? (
        <Link
          href="/list"
          className="group flex items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 px-4 py-2.5 shadow-2xs transition-all hover:bg-amber-100 active:scale-[0.98]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">🧺</span>
            <p className="text-xs sm:text-sm font-bold text-amber-950 truncate">
              โหมดเดินตลาด: <span className="font-semibold text-amber-800">กำลังซื้อ {remaining} รายการ</span>
            </p>
          </div>
          <span className="text-xs font-bold text-amber-900 group-hover:translate-x-0.5 transition-transform shrink-0">
            เปิดตะกร้า ›
          </span>
        </Link>
      ) : null}

      {/* ── เมนูหลัก Cards สำหรับ Mobile-First ── */}
      <nav aria-label="เมนูหลัก" className="space-y-3.5">
        {/* เมนูที่ 1: การ์ดสั่งของ (Hero Card สูงเด่นกว่าการ์ดอื่น 1.5x+, พื้นหลัง mint-700 ตัวหนังสือขาว) */}
        <Link
          href="/shopping"
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-mint-600 bg-gradient-to-br from-mint-700 to-emerald-800 p-5 sm:p-6 text-white shadow-md shadow-mint-900/15 transition-all hover:to-mint-900 hover:shadow-lg active:scale-[0.98] min-h-[200px]"
        >
          {/* แสงประกายตกแต่งพื้นหลัง */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-xl" />
          <div className="pointer-events-none absolute right-4 top-4 text-2xl font-black text-white/40 transition-all group-hover:translate-x-1 group-hover:text-white">
            →
          </div>

          <div className="flex items-center gap-4 sm:gap-5">
            {/* ไอคอนตะกร้าขนาดยักษ์ พร้อม animate-pop */}
            <div className="grid h-16 w-16 sm:h-20 sm:w-20 shrink-0 place-items-center rounded-3xl bg-white/20 text-4xl sm:text-5xl shadow-inner animate-pop backdrop-blur-xs">
              🛒
            </div>

            <div className="min-w-0 flex-1 pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  สั่งของ
                </h2>
                {remaining > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-amber-300 px-2.5 py-0.5 text-xs font-black text-amber-950 shadow-xs">
                    เหลือ {remaining}
                  </span>
                ) : null}
              </div>

              {/* ข้อความอธิบาย: ถ้ามีของค้างจะแสดงจำนวนที่ยังไม่ได้ซื้อเด่นชัด */}
              {remaining > 0 ? (
                <p className="mt-1.5 text-sm sm:text-base font-bold text-amber-200 leading-snug">
                  สั่งของ · เหลือ {remaining} อย่างที่ยังไม่ได้ซื้อ
                </p>
              ) : (
                <p className="mt-1.5 text-sm sm:text-base font-medium text-mint-100 leading-snug">
                  เลือกของที่ต้องซื้อ • ค้นหาด่วน
                </p>
              )}
            </div>
          </div>

          {/* แถบ Action ด้านล่างภายในการ์ด ให้สัดส่วนสูงและสวยงาม */}
          <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3 text-xs sm:text-sm font-semibold text-mint-100">
            <span className="flex items-center gap-1.5">
              <span>✨</span>
              <span>{remaining > 0 ? "มีรายการรอซื้ออยู่" : "แตะเพื่อเลือกของเข้าบ้าน"}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-3 py-1 text-xs font-bold text-white transition-colors group-hover:bg-white group-hover:text-mint-800">
              <span>{remaining > 0 ? "สั่งเพิ่ม / ตรวจของ" : "เริ่มสั่งของ"}</span>
              <span>→</span>
            </span>
          </div>
        </Link>

        {/* เมนูที่ 2 & 3: ประวัติการสั่ง และ ตั้งค่า จัดวางเป็น 2 คอลัมน์ด้านล่าง */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* การ์ดประวัติการสั่ง */}
          <Link
            href="/history"
            className="group flex flex-col justify-between rounded-3xl border-2 border-amber-200/80 bg-white p-3.5 sm:p-4 shadow-sm transition-all hover:border-amber-400 hover:shadow-md active:scale-[0.98] active:bg-amber-50/40 min-h-[115px]"
          >
            <div className="flex items-center justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-2xl shadow-2xs group-hover:scale-105 transition-transform">
                📋
              </div>
              <span className="text-base text-amber-600 font-bold opacity-70 group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-base font-bold text-ink group-hover:text-amber-800 transition-colors">
                ประวัติการสั่ง
              </h3>
              <p className="mt-0.5 text-xs font-medium text-ink-soft truncate">
                ดูรายการที่เคยสั่ง
              </p>
            </div>
          </Link>

          {/* การ์ดตั้งค่า */}
          <Link
            href="/settings"
            className="group flex flex-col justify-between rounded-3xl border-2 border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-sm transition-all hover:border-slate-400 hover:shadow-md active:scale-[0.98] active:bg-slate-50/60 min-h-[115px]"
          >
            <div className="flex items-center justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-zinc-100 text-2xl shadow-2xs group-hover:scale-105 transition-transform">
                ⚙️
              </div>
              <span className="text-base text-slate-500 font-bold opacity-70 group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-base font-bold text-ink group-hover:text-slate-800 transition-colors">
                ตั้งค่า
              </h3>
              <p className="mt-0.5 text-xs font-medium text-ink-soft truncate">
                Telegram • สินค้า
              </p>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}

import Link from "next/link";
import HistoryFilter from "@/components/HistoryFilter";
import { requireMember } from "@/lib/auth";
import { relDay, thaiDate } from "@/lib/format";
import { getHistory } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; q?: string }>;
}) {
  const { family } = await requireMember();
  const { month, q } = await searchParams;

  const { rows, summary, availableMonths } = await getHistory(family.id, {
    month: month || undefined,
    search: q || undefined,
  });

  return (
    <div className="space-y-4 pt-1">
      {/* ── Header Bar: ปุ่มหน้าหลัก & หัวข้อ ── */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-2xl border border-mint-200/90 bg-white px-3.5 py-2 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
        >
          <span className="text-base font-black text-mint-700">←</span>
          <span>หน้าหลัก</span>
        </Link>
        <h1 className="text-xl font-black text-ink flex items-center gap-1.5">
          <span>📋</span>
          <span>ประวัติการสั่ง</span>
        </h1>
      </div>

      {/* ── ช่องค้นหาเลขออเดอร์ และตัวกรองเดือน ── */}
      <HistoryFilter
        availableMonths={availableMonths}
        selectedMonth={month}
        searchQuery={q}
      />

      {/* ── สรุปภาพรวมแบบ Compact Card ── */}
      {summary && summary.activeAndDoneRounds > 0 ? (
        <div className="flex items-center justify-between rounded-2xl border border-mint-200/80 bg-mint-50/60 px-4 py-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-base">📊</span>
            <span className="text-sm font-bold text-ink">
              สรุป{month ? `เดือน ${month}` : "การสั่งซื้อ"}
            </span>
          </div>
          <div className="text-xs font-bold text-mint-800">
            <span>{summary.activeAndDoneRounds} รอบ</span>
            <span className="mx-1.5 text-mint-400">·</span>
            <span>{summary.totalItemsCount} รายการ</span>
          </div>
        </div>
      ) : null}

      {/* ── รายการออเดอร์ (Compact Order Cards) ── */}
      {rows.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-mint-200/80 bg-white/60 p-8 text-center mt-6">
          <p className="text-4xl">🔍</p>
          <p className="mt-2 text-sm font-bold text-ink">
            {q || month ? "ไม่พบรายการตามเงื่อนไขที่ค้นหา" : "ยังไม่มีประวัติการสั่งซื้อ"}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {q || month ? "ลองเปลี่ยนคำค้นหาหรือเลือกทุกเดือน" : "เมื่อสั่งของ รายการจะบันทึกไว้ที่นี่"}
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map(({ list, count }) => (
            <li key={list.id}>
              <Link
                href={`/history/${list.id}`}
                className="group block rounded-2xl border border-mint-200/90 bg-white p-4 shadow-2xs transition-all hover:border-mint-400 hover:shadow-xs active:scale-[0.99] active:bg-mint-50/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* วันที่และเลขออเดอร์ */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-black text-ink leading-snug">
                        {thaiDate(list.created_at)}
                      </h2>
                      {list.order_no ? (
                        <span className="font-mono text-xs font-bold text-mint-700 bg-mint-50 px-2 py-0.5 rounded-lg border border-mint-200/80">
                          #{list.order_no}
                        </span>
                      ) : null}
                    </div>

                    {/* จำนวนรายการและเวลา */}
                    <p className="mt-1 text-xs font-medium text-ink-soft flex items-center gap-1.5">
                      <span>{count} รายการ</span>
                      <span className="text-slate-300">·</span>
                      <span>{relDay(list.created_at)}</span>
                      {list.cancelled_at ? (
                        <span className="text-rose-500 font-semibold"> (ยกเลิก)</span>
                      ) : null}
                    </p>
                  </div>

                  {/* Status Badge สีอ่อน และลูกศร */}
                  <div className="flex items-center gap-2 shrink-0">
                    {list.status === "active" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>กำลังซื้อ</span>
                      </span>
                    ) : list.status === "cancelled" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200/80">
                        <span>✕ ยกเลิก</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200/80">
                        <span>✓ เสร็จแล้ว</span>
                      </span>
                    )}

                    <span className="text-slate-400 font-bold text-lg group-hover:translate-x-0.5 group-hover:text-ink transition-all">
                      ›
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

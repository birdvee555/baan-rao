import Link from "next/link";
import HistoryFilter from "@/components/HistoryFilter";
import { requireMember } from "@/lib/auth";
import { relDay, thaiDate } from "@/lib/format";
import { getHistory } from "@/lib/queries";

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
    <>
      <Link href="/" className="inline-block py-2 text-sm text-ink-soft">
        ← กลับ
      </Link>
      <h1 className="text-2xl font-bold text-ink">📖 ประวัติการสั่ง</h1>

      {/* ค้นหาและกรองเดือน */}
      <HistoryFilter
        availableMonths={availableMonths}
        selectedMonth={month}
        searchQuery={q}
      />

      {/* สรุปประจำเดือนสั้น ๆ (ไม่นับที่ยกเลิก) */}
      {summary && summary.activeAndDoneRounds > 0 ? (
        <div className="mt-4 rounded-3xl border-2 border-mint-100 bg-white p-4 text-xs space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between border-b border-mint-100/60 pb-2">
            <span className="font-bold text-ink text-sm">
              📊 สรุป {month ? `เดือน ${month}` : "ภาพรวม"}
            </span>
            <span className="text-ink-soft">
              สั่งซื้อ <b>{summary.activeAndDoneRounds}</b> รอบ • รวม <b>{summary.totalItemsCount}</b> รายการ
            </span>
          </div>

          {summary.top10Products.length > 0 ? (
            <div>
              <p className="font-semibold text-ink-soft mb-1.5">⭐ ของที่สั่งบ่อย 10 อันดับ:</p>
              <div className="flex flex-wrap gap-1.5">
                {summary.top10Products.map((p, idx) => (
                  <span
                    key={p.name}
                    className="inline-flex items-center gap-1 rounded-xl bg-mint-50 px-2 py-1 text-mint-800 border border-mint-200/60 text-[11px]"
                  >
                    <span>{idx + 1}.</span>
                    <span>{p.emoji}</span>
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-mint-600">({p.count})</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* รายการออเดอร์ */}
      {rows.length === 0 ? (
        <p className="mt-10 text-center text-ink-soft">
          {q || month ? "ไม่พบรายการตามเงื่อนไขที่ค้นหา" : "ยังไม่เคยสั่งของ"}
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {rows.map(({ list, count }) => (
            <li key={list.id}>
              <Link
                href={`/history/${list.id}`}
                className="flex min-h-16 items-center gap-3 rounded-2xl border-2 border-mint-100 bg-white px-4 py-3 shadow-xs hover:border-mint-200 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {list.order_no ? (
                      <span className="font-mono font-bold text-mint-700 text-base">
                        #{list.order_no}
                      </span>
                    ) : null}
                    <span className="text-sm font-semibold text-ink">
                      {thaiDate(list.created_at)}
                    </span>
                    <span className="text-xs text-ink-soft">({relDay(list.created_at)})</span>
                  </div>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {count} รายการ
                    {list.cancelled_at ? ` • ยกเลิกเมื่อ ${relDay(list.cancelled_at)}` : ""}
                  </p>
                </div>

                {/* ป้ายสถานะ */}
                {list.status === "active" ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    กำลังซื้อ
                  </span>
                ) : list.status === "cancelled" ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                    ยกเลิกแล้ว
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    เสร็จแล้ว
                  </span>
                )}

                <span aria-hidden className="text-ink-soft font-bold">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

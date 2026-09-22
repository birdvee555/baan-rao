import Link from "next/link";
import { notFound } from "next/navigation";
import ReorderAgain from "@/components/ReorderAgain";
import { requireMember } from "@/lib/auth";
import { fmtQty, relDay, thaiDate } from "@/lib/format";
import { getListDetail, getProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { family } = await requireMember();
  const [detail, products] = await Promise.all([
    getListDetail(family.id, id),
    getProducts(family.id),
  ]);
  if (!detail) notFound();

  const alive = new Set(products.map((p) => p.id));
  const reorderItems = detail.items
    .filter((i) => i.product_id && alive.has(i.product_id))
    .map((i) => ({ productId: i.product_id as string, q: i.quantity, n: i.note ?? "" }));

  const { list, items } = detail;

  return (
    <div className="space-y-4 pt-1">
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 rounded-2xl border border-mint-200/90 bg-white px-3.5 py-2 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
        >
          <span className="text-base font-black text-mint-700">←</span>
          <span>ประวัติการสั่ง</span>
        </Link>
        <span className="text-sm font-bold text-ink-soft">รายละเอียด</span>
      </div>

      {/* ── ข้อมูลสรุปออเดอร์ Card ── */}
      <div className="rounded-3xl border border-mint-200/90 bg-white p-4.5 shadow-2xs space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-ink">
                {thaiDate(list.created_at)}
              </h1>
              {list.order_no ? (
                <span className="font-mono text-sm font-bold text-mint-700 bg-mint-50 px-2 py-0.5 rounded-lg border border-mint-200">
                  #{list.order_no}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs font-medium text-ink-soft">
              {relDay(list.created_at)} • รวม {items.length} รายการ
              {list.cancelled_at ? ` • ยกเลิกเมื่อ ${relDay(list.cancelled_at)}` : ""}
            </p>
          </div>

          {/* ป้ายสถานะ */}
          <div>
            {list.status === "active" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>กำลังซื้อ</span>
              </span>
            ) : list.status === "cancelled" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                <span>✕ ยกเลิก</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                <span>✓ เสร็จแล้ว</span>
              </span>
            )}
          </div>
        </div>

        {list.status === "cancelled" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800 font-semibold">
            ❌ ออเดอร์นี้ถูกยกเลิกแล้ว
          </div>
        ) : null}
      </div>

      {/* ── รายการสินค้าในออเดอร์ ── */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-ink-soft px-1">
          รายการสินค้า ({items.length} อย่าง):
        </h2>

        <ul className="space-y-2">
          {items.map((i) => (
            <li
              key={i.id}
              className={`flex items-center gap-3 rounded-2xl border bg-white p-3.5 shadow-2xs transition-all ${
                i.is_purchased
                  ? "border-mint-100 bg-mint-50/20"
                  : "border-mint-200/80"
              }`}
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint-50 text-2xl border border-mint-100">
                {i.emoji || "📦"}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-base font-bold leading-snug ${
                    i.is_purchased ? "text-ink-soft line-through" : "text-ink"
                  }`}
                >
                  {i.name_snapshot}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-soft">
                  {i.note ? <span>📝 {i.note}</span> : null}
                  {i.is_purchased ? (
                    <span className="font-semibold text-mint-700">✓ ซื้อแล้ว</span>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span className="text-base font-black text-mint-700">
                  × {fmtQty(i.quantity)}
                </span>
                <span className="ml-1 text-xs font-medium text-ink-soft">
                  {i.unit}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ── ปุ่มสั่งเหมือนครั้งนี้ ── */}
      {list.status !== "cancelled" && reorderItems.length > 0 ? (
        <ReorderAgain familyId={family.id} items={reorderItems} />
      ) : null}
    </div>
  );
}

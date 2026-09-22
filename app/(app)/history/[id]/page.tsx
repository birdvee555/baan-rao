import Link from "next/link";
import { notFound } from "next/navigation";
import ReorderAgain from "@/components/ReorderAgain";
import { requireMember } from "@/lib/auth";
import { fmtQty, relDay, thaiDate } from "@/lib/format";
import { getListDetail, getProducts } from "@/lib/queries";

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
    <>
      <div className="mb-3">
        <Link
          href="/history"
          className="inline-flex items-center gap-2 rounded-2xl border border-mint-200/80 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
        >
          <span className="text-base font-black text-mint-700">←</span>
          <span>ประวัติ</span>
        </Link>
      </div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">
          {list.order_no ? <span className="text-mint-700 font-mono mr-2">#{list.order_no}</span> : null}
          <span>{thaiDate(list.created_at)}</span>
        </h1>

        {/* ป้ายสถานะ */}
        {list.status === "active" ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            กำลังซื้อ
          </span>
        ) : list.status === "cancelled" ? (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
            ยกเลิกแล้ว
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            เสร็จแล้ว
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-ink-soft">
        ({relDay(list.created_at)}) • รวม {items.length} รายการ
        {list.cancelled_at ? ` • ยกเลิกเมื่อ ${relDay(list.cancelled_at)}` : ""}
      </p>

      {list.status === "cancelled" ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 font-semibold">
          ❌ ออเดอร์นี้ถูกยกเลิกแล้ว
        </div>
      ) : null}

      <ul className="mt-4 space-y-2">
        {items.map((i) => (
          <li
            key={i.id}
            className={`flex items-center gap-3 rounded-2xl bg-white px-4 py-3 border-2 ${
              i.is_purchased ? "border-transparent bg-slate-100/70" : "border-mint-100"
            }`}
          >
            <span className="text-3xl">{i.emoji}</span>
            <span className="min-w-0 flex-1">
              <span
                className={`block text-lg font-semibold leading-snug ${
                  i.is_purchased ? "line-through text-ink-soft" : "text-ink"
                }`}
              >
                {i.name_snapshot}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {i.note ? <span className="block text-sm text-ink-soft">📝 {i.note}</span> : null}
                {i.is_purchased ? (
                  <span className="text-xs font-bold text-mint-700">✓ ซื้อแล้ว</span>
                ) : null}
              </div>
            </span>
            <span className="shrink-0 text-lg font-bold text-mint-700">
              × {fmtQty(i.quantity)} <span className="text-sm font-normal text-ink-soft">{i.unit}</span>
            </span>
          </li>
        ))}
      </ul>

      {list.status !== "cancelled" ? (
        <ReorderAgain familyId={family.id} items={reorderItems} />
      ) : null}
    </>
  );
}

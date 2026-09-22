"use client";

import Link from "next/link";
import { startTransition, useMemo, useOptimistic, useState } from "react";
import { fmtQty } from "@/lib/format";
import { cancelList, completeList, toggleItem } from "@/lib/actions/shop";
import ItemSheet from "./ItemSheet";
import ProductIcon from "./ProductIcon";
import { useLongPress } from "./useLongPress";

export type CheckItem = {
  id: string;
  name: string;
  emoji: string;
  quantity: number;
  unit: string;
  note: string | null;
  purchased: boolean;
  category?: {
    id: string;
    name: string;
    icon: string;
    sortOrder?: number;
  };
};

type Props = {
  items: CheckItem[];
  orderNo?: string | null;
  orderers?: { avatar: string; name: string }[];
};

export default function Checklist({ items, orderNo }: Props) {
  const [view, setOptimistic] = useOptimistic(
    items,
    (cur, change: { id: string; purchased: boolean }) =>
      cur.map((i) => (i.id === change.id ? { ...i, purchased: change.purchased } : i)),
  );
  const [armed, setArmed] = useState(false);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [editing, setEditing] = useState<CheckItem | null>(null);
  const [focusMode, setFocusMode] = useState(false); // ซ่อนของที่ซื้อแล้ว
  const [showDoneList, setShowDoneList] = useState(false);

  const todo = view.filter((i) => !i.purchased);
  const done = view.filter((i) => i.purchased);

  function toggle(i: CheckItem) {
    const next = !i.purchased;
    startTransition(async () => {
      setOptimistic({ id: i.id, purchased: next });
      await toggleItem(i.id, next);
    });
  }

  function finish() {
    if (todo.length > 0 && !armed) {
      setArmed(true);
      return;
    }
    startTransition(async () => {
      await completeList();
    });
  }

  function handleCancelOrder() {
    if (!cancelArmed) {
      setCancelArmed(true);
      return;
    }
    setIsCancelling(true);
    startTransition(async () => {
      await cancelList();
    });
  }

  // ── จัดกลุ่มสินค้าตามหมวดหมู่ (ผัก, ของสด, ผลไม้, อื่นๆ) ──
  const groupedCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; icon: string; sortOrder: number; items: CheckItem[] }>();

    for (const item of view) {
      const cat = item.category || { id: "cat_other", name: "อื่นๆ", icon: "📦", sortOrder: 99 };
      if (!map.has(cat.id)) {
        map.set(cat.id, {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          sortOrder: cat.sortOrder ?? 99,
          items: [],
        });
      }
      map.get(cat.id)!.items.push(item);
    }

    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [view]);

  if (view.length === 0) {
    return (
      <div className="mt-6 text-center">
        <div className="mb-6 flex justify-start">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-mint-200/80 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
          >
            <span className="text-base font-black text-mint-700">←</span>
            <span>หน้าหลัก</span>
          </Link>
        </div>
        <p className="text-5xl">🌿</p>
        <p className="mt-3 text-lg font-semibold">ตอนนี้ไม่มีของที่ต้องซื้อ</p>
        <div className="mt-5 flex flex-col items-center gap-3">
          <Link
            href="/shopping"
            className="inline-flex h-13 items-center rounded-2xl bg-mint-700 px-8 text-base font-bold text-white shadow-md active:bg-mint-800 transition-colors"
          >
            🛒 ไปสั่งของ
          </Link>
        </div>
      </div>
    );
  }

  const pct = Math.round((done.length / view.length) * 100);

  return (
    <>
      <div className="mb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-mint-200/80 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
        >
          <span className="text-base font-black text-mint-700">←</span>
          <span>หน้าหลัก</span>
        </Link>
      </div>

      <div className="mt-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ink flex items-baseline gap-2">
            <span>📋 รายการที่ต้องซื้อ</span>
            {orderNo ? <span className="text-base font-semibold text-mint-700">#{orderNo}</span> : null}
          </h1>
          {/* สวิตช์ Focus Mode: ซ่อนของที่ซื้อแล้ว */}
          <button
            type="button"
            onClick={() => setFocusMode(!focusMode)}
            aria-pressed={focusMode}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
              focusMode
                ? "border-2 border-mint-600 bg-mint-600 text-white shadow-xs"
                : "border-2 border-mint-200 bg-white text-ink-soft hover:border-mint-300"
            }`}
          >
            <span>🎯</span>
            <span>{focusMode ? "ซ่อนที่ซื้อแล้ว" : "โหมดโฟกัส"}</span>
          </button>
        </div>

        {/* แถบ Progress Bar สรุปความคืบหน้าการซื้อ */}
        <div className="mt-3 flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-mint-100"
          >
            <div
              className="h-full rounded-full bg-mint-500 transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-ink-soft shrink-0">
            {todo.length === 0 ? "🎉 ซื้อครบแล้ว" : `เหลือ ${todo.length} จาก ${view.length} อย่าง`}
          </span>
        </div>
      </div>

      {/* ── รายการของแยกตามโซน/หมวดหมู่ ── */}
      {todo.length > 0 ? (
        <div className="mt-5 space-y-5">
          {groupedCategories.map((group) => {
            // หากเปิด Focus Mode ให้แสดงเฉพาะของที่ยังไม่ซื้อในหมวดนี้
            const itemsToShow = focusMode
              ? group.items.filter((i) => !i.purchased)
              : group.items;

            if (itemsToShow.length === 0) return null;

            const groupTodo = group.items.filter((i) => !i.purchased).length;
            const groupDone = group.items.filter((i) => i.purchased).length;

            return (
              <section key={group.id} className="rounded-3xl border-2 border-mint-100/90 bg-white/70 p-3.5 shadow-xs">
                <div className="mb-2.5 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{group.icon}</span>
                    <h2 className="text-base font-bold text-ink">{group.name}</h2>
                  </div>
                  <span className="text-xs font-semibold text-ink-soft bg-mint-50 px-2 py-0.5 rounded-full border border-mint-100">
                    {groupTodo === 0 ? "✓ ครบแล้ว" : `เหลือ ${groupTodo} / ${group.items.length}`}
                  </span>
                </div>

                <ul className="space-y-2">
                  {itemsToShow.map((i) => (
                    <Row key={i.id} item={i} onToggle={() => toggle(i)} onEdit={() => setEditing(i)} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl bg-mint-100/80 p-8 text-center border border-mint-200 shadow-xs">
          <p className="animate-pop text-6xl">🎉</p>
          <p className="mt-3 text-xl font-bold text-ink">ซื้อของครบทุกอย่างแล้ว!</p>
          <p className="mt-1 text-sm text-ink-soft">กดปุ่มด้านล่างเพื่อบันทึกและปิดรอบนี้</p>
        </div>
      )}

      {/* ── รายการที่ซื้อแล้ว (เมื่ออยู่ในโหมดโฟกัส) ── */}
      {focusMode && done.length > 0 ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowDoneList(!showDoneList)}
            className="flex w-full items-center justify-between rounded-2xl border border-mint-200 bg-mint-50/60 px-4 py-3 text-xs font-bold text-ink-soft hover:bg-mint-100/60 transition-colors"
          >
            <span>✅ ซื้อแล้วที่ซ่อนอยู่ ({done.length} อย่าง)</span>
            <span>{showDoneList ? "▲ ซ่อน" : "▼ ดูรายการ"}</span>
          </button>

          {showDoneList ? (
            <ul className="mt-2.5 space-y-2">
              {done.map((i) => (
                <Row key={i.id} item={i} onToggle={() => toggle(i)} onEdit={() => setEditing(i)} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* ── คำแนะนำ & ปุ่มแก้ไข ── */}
      <p className="mt-6 text-center text-xs text-ink-soft">
        💡 แตะเพื่อติ๊กซื้อแล้ว · กดค้างที่รายการเพื่อแก้จำนวนหรือนำออก
      </p>

      {editing ? <ItemSheet key={editing.id} item={editing} onClose={() => setEditing(null)} /> : null}

      {/* ── ปุ่มปิดรายการ (เสร็จสิ้นรอบนี้) ── */}
      <button
        type="button"
        onClick={finish}
        className={
          todo.length === 0
            ? "mt-4 h-14 w-full rounded-2xl bg-mint-700 text-lg font-bold text-white shadow-md active:bg-mint-800 transition-colors"
            : `mt-4 h-12 w-full rounded-2xl text-sm transition-colors ${
                armed
                  ? "bg-rose-soft font-semibold text-rose-ink border border-rose-200"
                  : "bg-white text-ink-soft border border-mint-100 hover:bg-slate-50"
              }`
        }
      >
        {todo.length === 0
          ? "✅ เสร็จสิ้นรอบนี้"
          : armed
            ? `กดอีกครั้งเพื่อปิดรายการ (ยังเหลือ ${todo.length} อย่าง)`
            : "ปิดรายการ ทั้งที่ยังซื้อไม่ครบ"}
      </button>

      {/* ปุ่มยกเลิกออเดอร์ทั้งใบ (กด 2 ครั้งเพื่อยืนยัน) */}
      <div className="mt-2 text-center">
        <button
          type="button"
          onClick={handleCancelOrder}
          disabled={isCancelling}
          className={`h-11 w-full rounded-2xl text-xs font-semibold transition-all ${
            cancelArmed
              ? "bg-rose-600 text-white shadow-sm active:bg-rose-700 font-bold"
              : "bg-transparent text-rose-500 hover:bg-rose-50"
          }`}
        >
          {isCancelling
            ? "กำลังยกเลิกออเดอร์…"
            : cancelArmed
              ? "⚠️ กดอีกครั้งเพื่อยืนยันยกเลิกออเดอร์นี้"
              : "❌ ยกเลิกออเดอร์นี้"}
        </button>
      </div>
    </>
  );
}

function Row({
  item: i,
  onToggle,
  onEdit,
}: {
  item: CheckItem;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const lp = useLongPress(onEdit);
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (lp.consumed()) return;
          onToggle();
        }}
        {...lp.handlers}
        aria-pressed={i.purchased}
        className={`flex min-h-16 w-full select-none items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all [-webkit-touch-callout:none] ${
          i.purchased ? "border-transparent bg-slate-100/60 opacity-60" : "border-mint-100 bg-white hover:border-mint-200"
        }`}
      >
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-white transition-colors ${
            i.purchased ? "animate-pop border-mint-600 bg-mint-600 text-sm font-bold" : "border-mint-300 bg-white"
          }`}
        >
          {i.purchased ? "✓" : ""}
        </span>
        <ProductIcon emoji={i.emoji} name={i.name} size={32} className="h-8 w-8 shrink-0 text-3xl leading-none" />
        <span className="min-w-0 flex-1">
          <span className={`block text-base font-semibold leading-snug ${i.purchased ? "line-through text-ink-soft" : "text-ink"}`}>
            {i.name}
          </span>
          {i.note ? <span className="block text-xs text-ink-soft mt-0.5">📝 {i.note}</span> : null}
        </span>
        <span className="shrink-0 text-right leading-tight">
          <span className={`text-base font-bold ${i.purchased ? "text-ink-soft" : "text-mint-700"}`}>
            × {fmtQty(i.quantity)}
          </span>
          <span className="block text-xs text-ink-soft">{i.unit}</span>
        </span>
      </button>
    </li>
  );
}

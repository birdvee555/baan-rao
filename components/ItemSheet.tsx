"use client";

import { useState, useTransition } from "react";
import { fmtQty } from "@/lib/format";
import { stepFor } from "@/lib/units";
import { removeItem, updateItem } from "@/lib/actions/shop";
import type { CheckItem } from "./Checklist";
import ProductIcon from "./ProductIcon";
import Sheet from "./Sheet";

/** แก้จำนวน/หมายเหตุ หรือเอาของออก จากรายการที่ส่งไปแล้ว */
export default function ItemSheet({ item, onClose }: { item: CheckItem; onClose: () => void }) {
  const step = stepFor(item.unit);
  const [qty, setQty] = useState(item.quantity);
  const [note, setNote] = useState(item.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saveArmed, setSaveArmed] = useState(false);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  const changed = qty !== item.quantity || note.trim() !== (item.note ?? "");

  function save() {
    if (item.purchased && !saveArmed) {
      setSaveArmed(true);
      return;
    }
    setError(null);
    start(async () => {
      const res = await updateItem(item.id, qty, note);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  function remove() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setError(null);
    start(async () => {
      const res = await removeItem(item.id);
      if (res.ok) onClose();
      else setError(res.error);
    });
  }

  return (
    <Sheet
      title={
        <span className="flex items-center gap-2">
          <ProductIcon emoji={item.emoji} name={item.name} size={28} className="text-2xl" />
          <span>{item.name}</span>
        </span>
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-2xl bg-white p-3">
          <p className="font-semibold">จำนวน</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(step, Math.round((q - step) * 100) / 100))}
              aria-label="ลดจำนวน"
              className="h-11 w-11 rounded-2xl bg-mint-50 text-xl font-bold"
            >
              −
            </button>
            <span className="w-14 text-center leading-none">
              <span className="block text-xl font-bold">{fmtQty(qty)}</span>
              <span className="block text-[11px] text-ink-soft">{item.unit}</span>
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(999, Math.round((q + step) * 100) / 100))}
              aria-label="เพิ่มจำนวน"
              className="h-11 w-11 rounded-2xl bg-mint-700 text-xl font-bold text-white"
            >
              +
            </button>
          </div>
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={100}
          placeholder="📝 หมายเหตุ (ไม่ใส่ก็ได้)"
          className="h-12 w-full rounded-2xl border-2 border-mint-100 bg-white px-4 text-base outline-none focus:border-mint-500"
        />

        {item.purchased ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2">
            <span>⚠️</span>
            <span>รายการนี้ถูกติ๊ก <b>"ซื้อแล้ว"</b> ไปแล้ว หากแก้ไขหรือเอาออก กรุณายืนยันอีกครั้ง</span>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-2xl bg-rose-soft px-4 py-3 text-sm text-rose-ink">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={save}
          disabled={pending || !changed}
          className={`h-14 w-full rounded-2xl text-lg font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 ${
            saveArmed ? "bg-amber-600 active:bg-amber-700" : "bg-mint-700 active:bg-mint-600"
          }`}
        >
          {pending
            ? "กำลังบันทึก…"
            : saveArmed
              ? "⚠️ กดอีกครั้งเพื่อยืนยันบันทึก (ซื้อแล้ว)"
              : "บันทึก"}
        </button>

        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className={`h-12 w-full rounded-2xl text-sm transition-all ${
            armed
              ? "bg-rose-soft font-semibold text-rose-ink border border-rose-200"
              : "text-ink-soft hover:bg-slate-50"
          }`}
        >
          {armed
            ? item.purchased
              ? "⚠️ ซื้อแล้ว! กดอีกครั้งเพื่อยืนยันเอาออก"
              : "กดอีกครั้งเพื่อเอาออกจากรายการ"
            : "🗑 เอาออกจากรายการ"}
        </button>
      </div>
    </Sheet>
  );
}

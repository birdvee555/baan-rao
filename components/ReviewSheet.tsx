"use client";

import { useState } from "react";
import type { DraftItem, Product } from "@/lib/types";
import { fmtQty } from "@/lib/format";
import ProductIcon from "./ProductIcon";
import Sheet from "./Sheet";

type Row = { product: Product; entry: DraftItem };

type Props = {
  rows: Row[];
  sending: boolean;
  onDelta: (p: Product, d: 1 | -1) => void;
  onRemove: (p: Product) => void;
  onNote: (p: Product, text: string) => void;
  onClear: () => void;
  onSend: () => void;
  onClose: () => void;
};

export default function ReviewSheet({
  rows,
  sending,
  onDelta,
  onRemove,
  onNote,
  onClear,
  onSend,
  onClose,
}: Props) {
  const [noteOpen, setNoteOpen] = useState<string | null>(null);

  return (
    <Sheet title="🛒 ตรวจรายการก่อนสั่ง" onClose={onClose}>
      <p className="-mt-3 mb-4 text-sm text-ink-soft">
        ตรวจสอบจำนวนและหมายเหตุก่อนกดยืนยัน ({rows.length} รายการ)
      </p>

      {rows.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-4xl">🧺</p>
          <p className="mt-2 font-semibold text-ink">ยังไม่ได้เลือกของ</p>
          <p className="mt-1 text-sm text-ink-soft">แตะเลือกสินค้าจากหน้าหลักได้เลย</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 inline-block rounded-2xl bg-mint-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm"
          >
            ← กลับไปเลือกของ
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-2.5">
            {rows.map(({ product: p, entry }) => {
              const showNote = noteOpen === p.id || entry.n !== "";
              return (
                <li
                  key={p.id}
                  className="rounded-3xl border-2 border-mint-100 bg-white p-3.5 shadow-xs transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-mint-700">☑</span>
                    <ProductIcon emoji={p.emoji} name={p.name} size={32} className="h-8 w-8 shrink-0 text-3xl leading-none" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-ink">{p.name}</p>
                      <p className="text-xs text-ink-soft">
                        {fmtQty(entry.q)} {p.unit}
                      </p>
                    </div>

                    {/* ปรับจำนวน */}
                    <div className="flex items-center gap-1 rounded-2xl border border-mint-200 bg-mint-50/70 p-1">
                      <button
                        type="button"
                        onClick={() => onDelta(p, -1)}
                        aria-label="ลดจำนวน"
                        className="grid h-8 w-8 place-items-center rounded-xl bg-white text-base font-bold text-ink shadow-xs active:bg-mint-100"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-ink">
                        {fmtQty(entry.q)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDelta(p, 1)}
                        aria-label="เพิ่มจำนวน"
                        className="grid h-8 w-8 place-items-center rounded-xl bg-mint-700 text-base font-bold text-white shadow-xs active:bg-mint-800"
                      >
                        +
                      </button>
                    </div>

                    {/* ปุ่มลบ */}
                    <button
                      type="button"
                      onClick={() => onRemove(p)}
                      aria-label={`ลบ ${p.name}`}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-base text-rose-500 transition-colors hover:bg-rose-50 active:bg-rose-100"
                    >
                      🗑
                    </button>
                  </div>

                  {/* ช่องหมายเหตุ */}
                  <div className="mt-2.5 border-t border-mint-100/60 pt-2">
                    {showNote ? (
                      <div className="relative">
                        <input
                          value={entry.n}
                          onChange={(e) => onNote(p, e.target.value)}
                          maxLength={100}
                          placeholder="📝 หมายเหตุ เช่น ขอใบอ่อน ๆ"
                          autoFocus={noteOpen === p.id}
                          className="h-9 w-full rounded-xl border border-mint-200 bg-cream/70 px-3 pr-7 text-xs outline-none focus:border-mint-500"
                        />
                        {entry.n ? (
                          <button
                            type="button"
                            onClick={() => onNote(p, "")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-soft opacity-60 hover:opacity-100"
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNoteOpen(p.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-mint-700"
                      >
                        <span>📝</span>
                        <span>เพิ่มหมายเหตุ</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* ปุ่มเพิ่มของ */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-mint-300 bg-mint-50/50 text-sm font-bold text-mint-700 transition-colors hover:bg-mint-100/70"
          >
            <span>＋</span>
            <span>เพิ่มของอื่น ๆ</span>
          </button>

          {/* ปุ่มยืนยันและปุ่มกลับ */}
          <div className="mt-4 space-y-2.5 pt-2">
            <button
              type="button"
              onClick={onSend}
              disabled={rows.length === 0 || sending}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-mint-700 text-lg font-bold text-white shadow-md transition-all active:scale-[0.98] active:bg-mint-800 disabled:opacity-50"
            >
              <span>🟢</span>
              <span>{sending ? "กำลังส่งรายการ…" : "ยืนยันการสั่ง"}</span>
            </button>

            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-ink-soft hover:bg-mint-50 hover:text-ink active:scale-95 transition-all"
              >
                <span className="text-mint-700">←</span>
                <span>กลับไปแก้ไข</span>
              </button>

              <button
                type="button"
                onClick={onClear}
                disabled={rows.length === 0}
                className="py-1 text-sm text-rose-500 underline hover:text-rose-700 disabled:opacity-40"
              >
                ล้างทั้งหมด
              </button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

"use client";

import { useRef } from "react";
import type { DraftItem, Product } from "@/lib/types";
import { fmtQty } from "@/lib/format";
import { stepFor } from "@/lib/units";
import ProductIcon from "./ProductIcon";

type Props = {
  product: Product;
  entry?: DraftItem;
  onToggle: () => void;
  onDelta: (d: 1 | -1) => void;
  onLongPress: () => void;
  onMenu?: () => void;
};

export default function ProductCard({ product: p, entry, onToggle, onDelta, onLongPress, onMenu }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fired = useRef(false);
  const on = !!entry;
  const atMin = !!entry && entry.q <= stepFor(p.unit);

  const cancel = () => clearTimeout(timer.current);

  return (
    <div
      className={`relative rounded-3xl border-2 transition-colors duration-150 ${
        on ? "border-mint-500 bg-mint-100" : "border-mint-100 bg-white"
      }`}
    >
      {/* ปุ่มจัดการสินค้า ⋮ (ขยาย touch target เป็น 44x44px แต่ visual คงเดิม ~28px) */}
      {onMenu ? (
        <button
          type="button"
          aria-label={`จัดการ ${p.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onMenu();
          }}
          className="absolute right-0 top-0 z-10 flex h-11 w-11 items-center justify-center"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full text-base font-bold text-ink-soft/60 hover:bg-black/5 hover:text-ink active:scale-90 active:bg-black/10 transition-all">
            ⋮
          </span>
        </button>
      ) : null}

      {entry?.n ? (
        <span className="absolute right-11 top-2 text-sm" aria-label="มีหมายเหตุ">
          📝
        </span>
      ) : null}

      <button
        type="button"
        aria-pressed={on}
        onClick={() => {
          if (fired.current) {
            fired.current = false; // กดค้างแล้ว ไม่นับเป็นการแตะ
            return;
          }
          onToggle();
        }}
        onPointerDown={() => {
          fired.current = false;
          timer.current = setTimeout(() => {
            fired.current = true;
            navigator.vibrate?.(10);
            onLongPress();
          }, 550);
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        className="flex w-full select-none flex-col items-center px-2 pb-1 pt-3 text-center [-webkit-touch-callout:none]"
      >
        <div key={on ? "on" : "off"} className={`h-11 w-11 flex items-center justify-center ${on ? "animate-pop" : ""}`}>
          <ProductIcon emoji={p.emoji} name={p.name} size={44} className="text-4xl leading-none" />
        </div>
        <span className="mt-2 line-clamp-2 min-h-[2.5rem] text-[15px] font-semibold leading-tight">
          {p.name}
        </span>
      </button>

      <div className="flex h-14 items-center px-1.5 pb-1.5">
        {entry ? (
          <>
            <button
              type="button"
              onClick={() => onDelta(-1)}
              aria-label={atMin ? "เอาออก" : "ลดจำนวน"}
              className="h-11 w-11 shrink-0 rounded-2xl bg-white text-xl font-bold text-ink active:bg-mint-200"
            >
              {atMin ? "✕" : "−"}
            </button>
            <div className="flex-1 text-center leading-none">
              <span key={entry.q} className="inline-block animate-bump text-xl font-bold">
                {fmtQty(entry.q)}
              </span>
              <span className="mt-0.5 block text-[11px] text-ink-soft">{p.unit}</span>
            </div>
            <button
              type="button"
              onClick={() => onDelta(1)}
              aria-label="เพิ่มจำนวน"
              className="h-11 w-11 shrink-0 rounded-2xl bg-mint-700 text-xl font-bold text-white active:bg-mint-600"
            >
              +
            </button>
          </>
        ) : (
          <p className="w-full text-center text-sm text-ink-soft">
            × {fmtQty(p.default_quantity)} {p.unit}
          </p>
        )}
      </div>
    </div>
  );
}

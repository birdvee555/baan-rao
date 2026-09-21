"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import ProductIcon from "./ProductIcon";
import Sheet from "./Sheet";

type Props = {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
  onHide: () => void;
};

export default function ProductActionMenu({ product, onClose, onEdit, onHide }: Props) {
  const [confirmHide, setConfirmHide] = useState(false);

  if (confirmHide) {
    return (
      <Sheet title="ซ่อนสินค้า" onClose={onClose}>
        <div className="space-y-4 text-center py-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-4xl border border-amber-100">
            <ProductIcon emoji={product.icon || product.emoji} name={product.name} size={40} />
          </div>

          <div>
            <h3 className="text-xl font-bold text-ink">
              ซ่อน {product.name} หรือไม่?
            </h3>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed px-2">
              สินค้านี้จะไม่แสดงในหน้าสั่งของ<br />
              แต่ประวัติการสั่งซื้อเดิมจะยังอยู่ครบถ้วน
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-2xl border-2 border-mint-100 bg-white font-bold text-ink-soft active:bg-mint-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => {
                onHide();
                onClose();
              }}
              className="h-12 rounded-2xl bg-rose-soft text-rose-ink font-bold border border-rose-200 active:bg-rose-100 transition-colors"
            >
              🗑️ ซ่อนสินค้า
            </button>
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      title={
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint-100 text-xl border border-mint-200">
            <ProductIcon emoji={product.icon || product.emoji} name={product.name} size={24} />
          </span>
          <span className="truncate font-bold text-base text-ink">{product.name}</span>
        </div>
      }
      onClose={onClose}
    >
      <div className="space-y-2.5 pt-1 pb-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            onEdit();
          }}
          className="flex h-14 w-full items-center gap-3.5 rounded-2xl border-2 border-mint-100 bg-white px-4 text-base font-bold text-ink active:bg-mint-50 transition-colors"
        >
          <span className="text-xl">📝</span>
          <span>แก้ไขสินค้า</span>
        </button>

        <button
          type="button"
          onClick={() => setConfirmHide(true)}
          className="flex h-14 w-full items-center gap-3.5 rounded-2xl border border-rose-100 bg-rose-soft/40 px-4 text-base font-bold text-rose-ink active:bg-rose-soft transition-colors"
        >
          <span className="text-xl">🗑️</span>
          <span>ซ่อนสินค้า</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 h-12 w-full rounded-2xl text-sm font-semibold text-ink-soft hover:text-ink transition-colors"
        >
          ปิด
        </button>
      </div>
    </Sheet>
  );
}

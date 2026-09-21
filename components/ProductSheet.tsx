"use client";

import { useState, useTransition } from "react";
import type { Category, Product } from "@/lib/types";
import { EMOJI_CATEGORIES, determineProductIcon } from "@/lib/emoji";
import { fmtQty } from "@/lib/format";
import { UNITS, stepFor } from "@/lib/units";
import { archiveProduct, saveProduct } from "@/lib/actions/shop";
import ProductIcon from "./ProductIcon";
import Sheet from "./Sheet";

type Props = {
  product?: Product; // ไม่ส่งมา = เพิ่มของใหม่
  categories: Category[];
  onClose: () => void;
  onSaved: (p: Product, isNew: boolean) => void;
  onArchived: (id: string, name: string) => void;
};

export default function ProductSheet({ product, categories, onClose, onSaved, onArchived }: Props) {
  const editing = !!product;
  const defaultCategory = categories.find((c) => c.name === "อื่นๆ" || c.icon === "📦") || categories[0];

  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(product?.category_id ?? defaultCategory?.id ?? null);
  const selectedCategory = categories.find((c) => c.id === categoryId);

  // ── จัดการ Icon (Auto vs Manual) ──
  const [iconSource, setIconSource] = useState<"auto" | "manual">(
    product?.icon_source ?? (product ? "manual" : "auto")
  );
  const [manualIcon, setManualIcon] = useState<string | null>(
    product ? (product.icon || product.emoji) : null
  );
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [customEmojiInput, setCustomEmojiInput] = useState("");

  const autoIcon = determineProductIcon(name, selectedCategory?.name ?? selectedCategory?.icon);
  const activeIcon = iconSource === "manual" && manualIcon ? manualIcon : autoIcon;

  // ── จัดการ หน่วย และ จำนวนเริ่มต้น ──
  const initialIsCustom = !!product && !UNITS.includes(product.unit);
  const [unit, setUnit] = useState(initialIsCustom ? "อื่นๆ" : (product?.unit ?? "ชิ้น"));
  const [customUnit, setCustomUnit] = useState(initialIsCustom ? product!.unit : "");
  const [qty, setQty] = useState(product?.default_quantity ?? 1);
  const [note, setNote] = useState(product?.default_note ?? "");

  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  const effectiveUnit = unit === "อื่นๆ" ? (customUnit.trim() || "ชิ้น") : unit;
  const step = stepFor(effectiveUnit);

  function changeUnit(u: string) {
    setUnit(u);
    const s = stepFor(u === "อื่นๆ" ? customUnit || "ชิ้น" : u);
    if (qty % s !== 0) setQty(Math.max(s, Math.round(qty / s) * s));
  }

  function save() {
    setError(null);
    const finalUnit = unit === "อื่นๆ" ? (customUnit.trim() || "ชิ้น") : unit;
    if (!name.trim()) {
      setError("ใส่ชื่อของด้วยนะ");
      return;
    }

    start(async () => {
      const res = await saveProduct({
        id: product?.id,
        categoryId: categoryId ?? defaultCategory?.id ?? null,
        name: name.trim(),
        icon: activeIcon,
        emoji: activeIcon,
        iconSource,
        unit: finalUnit,
        defaultQuantity: qty,
        defaultNote: note,
      });
      if (res.ok) onSaved(res.product, !editing);
      else setError(res.error);
    });
  }

  function archive() {
    if (!product) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    start(async () => {
      await archiveProduct(product.id);
      onArchived(product.id, product.name);
    });
  }

  return (
    <Sheet title={editing ? "📝 แก้ไขสินค้า" : "＋ เพิ่มของ"} onClose={onClose}>
      <div className="space-y-4">
        {/* ── 1. Icon Section (ในหน้าแก้ไขแสดงพร้อมปุ่มเปลี่ยน / ในหน้าเพิ่มแสดงพรีวิวอัตโนมัติ) ── */}
        {editing ? (
          <div className="rounded-2xl border border-mint-200 bg-white p-3.5">
            <label className="mb-2 block text-sm font-bold text-ink">Icon</label>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-mint-100 border border-mint-200 text-3xl">
                <ProductIcon emoji={activeIcon} name={name} size={36} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink-soft">
                  {iconSource === "manual" ? "กำหนดเอง (Manual)" : "ระบบเลือกให้อัตโนมัติ (Auto)"}
                </p>
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="mt-1 inline-flex h-9 items-center rounded-xl border border-mint-200 bg-mint-50 px-3 text-sm font-bold text-mint-700 active:bg-mint-100 transition-colors"
                >
                  {showIconPicker ? "▲ ปิดตัวเลือก" : "เปลี่ยน Icon"}
                </button>
              </div>
            </div>

            {/* ส่วนเลือก Emoji เมื่อกด เปลี่ยน Icon */}
            {showIconPicker ? (
              <div className="mt-3 space-y-3 rounded-2xl border border-mint-200 bg-mint-50/50 p-3">
                {EMOJI_CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    <p className="mb-1.5 text-xs font-bold text-ink-soft">
                      {cat.icon} {cat.name}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.emojis.map((e) => {
                        const isSelected = activeIcon === e;
                        return (
                          <button
                            key={e}
                            type="button"
                            onClick={() => {
                              setManualIcon(e);
                              setIconSource("manual");
                            }}
                            className={`flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition-all ${
                              isSelected
                                ? "bg-mint-200 ring-2 ring-mint-600 scale-110"
                                : "bg-white hover:bg-mint-100/70"
                            }`}
                          >
                            {e}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* ช่องกรอก/วาง Emoji เอง */}
                <div className="pt-2 border-t border-mint-200/60">
                  <label className="mb-1 block text-xs font-semibold text-ink-soft">
                    หรือใส่ Emoji เอง:
                  </label>
                  <input
                    value={customEmojiInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomEmojiInput(val);
                      const trimmed = val.trim();
                      if (trimmed) {
                        setManualIcon(trimmed);
                        setIconSource("manual");
                      }
                    }}
                    placeholder="พิมพ์หรือวาง Emoji เช่น 🥑"
                    className="h-10 w-full rounded-xl border border-mint-200 bg-white px-3 text-sm outline-none focus:border-mint-500"
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── 2. ชื่อสินค้า ── */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink-soft">
            ชื่อสินค้า
          </label>
          <div className="flex items-center gap-3">
            {!editing ? (
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-mint-100 border border-mint-200 text-3xl"
                title="ไอคอนที่ระบบเลือกให้อัตโนมัติ"
              >
                <ProductIcon emoji={activeIcon} name={name} size={36} />
              </span>
            ) : null}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="ชื่อของ เช่น ข้าวโพดอ่อน"
              autoFocus={!editing}
              className="h-14 min-w-0 flex-1 rounded-2xl border-2 border-mint-100 bg-white px-4 text-base font-semibold text-ink outline-none focus:border-mint-500"
            />
          </div>
        </div>

        {/* ── 3. หมวดหมู่ Dropdown ── */}
        {categories.length > 0 ? (
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink-soft">
              หมวดหมู่
            </label>
            <div className="relative">
              <select
                value={categoryId ?? defaultCategory?.id ?? ""}
                onChange={(e) => setCategoryId(e.target.value || null)}
                className="h-13 w-full appearance-none rounded-2xl border-2 border-mint-100 bg-white px-4 pr-10 text-base font-semibold text-ink outline-none focus:border-mint-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-soft opacity-70">
                ▼
              </span>
            </div>
          </div>
        ) : null}

        {/* ── 4. หน่วย ── */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink-soft">
            หน่วย
          </label>
          <div className="flex flex-wrap gap-2">
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => changeUnit(u)}
                aria-pressed={unit === u}
                className={`h-11 rounded-full px-4 text-base transition-colors ${
                  unit === u ? "bg-mint-700 font-semibold text-white shadow-xs" : "bg-white text-ink border border-mint-100"
                }`}
              >
                {u}
              </button>
            ))}
            <button
              type="button"
              onClick={() => changeUnit("อื่นๆ")}
              aria-pressed={unit === "อื่นๆ"}
              className={`h-11 rounded-full px-4 text-base transition-colors ${
                unit === "อื่นๆ" ? "bg-mint-700 font-semibold text-white shadow-xs" : "bg-white text-ink border border-mint-100"
              }`}
            >
              อื่นๆ
            </button>
          </div>
          {unit === "อื่นๆ" ? (
            <input
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="ระบุหน่วยเอง เช่น กรัม, กล่อง"
              maxLength={20}
              className="mt-2 h-11 w-full rounded-2xl border border-mint-200 bg-white px-4 text-sm outline-none focus:border-mint-500"
            />
          ) : null}
        </div>

        {/* ── 5. จำนวนเริ่มต้น ── */}
        <div className="flex items-center justify-between rounded-2xl bg-white p-3.5 border border-mint-100">
          <div>
            <p className="font-semibold text-ink">จำนวนเริ่มต้น</p>
            <p className="text-xs text-ink-soft">ใส่ให้ทันทีเมื่อแตะเลือก</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(step, Math.round((q - step) * 100) / 100))}
              aria-label="ลดจำนวน"
              className="h-11 w-11 rounded-2xl bg-mint-50 text-xl font-bold active:bg-mint-100 text-ink"
            >
              −
            </button>
            <span className="w-16 text-center leading-none">
              <span className="block text-xl font-bold text-ink">{fmtQty(qty)}</span>
              <span className="block text-[11px] text-ink-soft mt-0.5">{effectiveUnit}</span>
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.round((q + step) * 100) / 100)}
              aria-label="เพิ่มจำนวน"
              className="h-11 w-11 rounded-2xl bg-mint-50 text-xl font-bold active:bg-mint-100 text-ink"
            >
              +
            </button>
          </div>
        </div>

        {/* ── 6. หมายเหตุเริ่มต้น ── */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink-soft">
            หมายเหตุเริ่มต้น (ถ้ามี)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={100}
            placeholder="เช่น ขออ่อน ๆ, เหลือง ๆ ส้ม ๆ"
            className="h-13 w-full rounded-2xl border-2 border-mint-100 bg-white px-4 text-base outline-none focus:border-mint-500"
          />
        </div>

        {error ? <p className="text-sm font-semibold text-rose-ink">{error}</p> : null}

        {/* ── ปุ่มดำเนินการด้านล่าง ── */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="h-13 rounded-2xl border-2 border-mint-200 bg-white font-bold text-ink-soft active:bg-mint-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="h-13 rounded-2xl bg-mint-700 font-bold text-white shadow-md active:bg-mint-800 disabled:opacity-50 transition-colors"
          >
            {pending ? "กำลังบันทึก…" : editing ? "บันทึก" : "＋ เพิ่มสินค้า"}
          </button>
        </div>

        {editing ? (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={archive}
              disabled={pending}
              className={`text-xs underline transition-colors ${
                armed ? "font-bold text-rose-ink" : "text-ink-soft hover:text-rose-ink"
              }`}
            >
              {armed ? "แตะอีกครั้งเพื่อยืนยันการซ่อนสินค้านี้" : "🗑️ ซ่อนสินค้านี้ (ไม่แสดงในหน้าสั่ง)"}
            </button>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

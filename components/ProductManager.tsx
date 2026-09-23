"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { Category, Product } from "@/lib/types";
import { archiveProduct } from "@/lib/actions/shop";
import { categorizeProduct } from "@/lib/categories";
import ProductIcon from "./ProductIcon";
import ProductSheet from "./ProductSheet";

type Props = {
  categories: Category[];
  initialProducts: Product[];
};

export default function ProductManager({ categories, initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editor, setEditor] = useState<{ product?: Product } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function flash(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  }

  // แผนที่หมวดหมู่ตาม ID
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) {
      map.set(c.id, c);
    }
    return map;
  }, [categories]);

  // Helper แมป Category ID ให้กับสินค้า (รองรับทั้ง category_id ใน DB และ smart fallback จากชื่อ)
  const resolveCatId = (p: Product) => {
    if (p.category_id) return p.category_id;
    return categorizeProduct(p.name, null, categories).id;
  };

  // กรองสินค้าตามค้นหาและหมวดหมู่
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== "all" && resolveCatId(p) !== selectedCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return p.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, selectedCategory, search, categories]);

  function handleSaved(saved: Product, isNew: boolean) {
    setProducts((prev) => {
      if (isNew) {
        return [saved, ...prev];
      }
      return prev.map((p) => (p.id === saved.id ? saved : p));
    });
    setEditor(null);
    flash(isNew ? `เพิ่ม "${saved.name}" สำเร็จ` : `บันทึก "${saved.name}" แล้ว`);
  }

  function handleArchived(id: string, name: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setEditor(null);
    flash(`ซ่อน "${name}" เรียบร้อยแล้ว`);
  }

  function handleQuickArchive(p: Product) {
    if (!window.confirm(`ต้องการซ่อนสินค้า "${p.name}" ใช่หรือไม่?`)) return;
    startTransition(async () => {
      await archiveProduct(p.id);
      handleArchived(p.id, p.name);
    });
  }

  return (
    <div className="space-y-5 pt-2">
      {/* ── ปุ่มย้อนกลับไปหน้าตั้งค่า ── */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-2xl border border-mint-200/80 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
        >
          <span className="text-base font-black text-mint-700">←</span>
          <span>ตั้งค่า</span>
        </Link>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">📦 ทะเบียนสินค้า</h1>
          <p className="mt-0.5 text-xs font-medium text-ink-soft">
            ทั้งหมด {products.length} รายการในระบบ
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditor({})}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-mint-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-mint-800 active:scale-95"
        >
          <span>＋</span>
          <span>เพิ่มสินค้า</span>
        </button>
      </div>

      {/* ── ค้นหาสินค้า ── */}
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-ink-soft opacity-60">
          🔍
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาสินค้าในทะเบียน..."
          className="h-12 w-full rounded-2xl border-2 border-mint-200 bg-white pl-10 pr-10 text-sm font-medium text-ink placeholder:text-ink-soft/60 outline-none focus:border-mint-500 shadow-2xs transition-colors"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-bold text-ink-soft hover:bg-slate-200 active:scale-90"
            aria-label="ล้างการค้นหา"
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* ── Category Filter Chips ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
            selectedCategory === "all"
              ? "bg-mint-700 text-white shadow-2xs"
              : "border border-mint-200 bg-white text-ink-soft hover:bg-mint-50"
          }`}
        >
          ทั้งหมด ({products.length})
        </button>
        {categories.map((c) => {
          const count = products.filter((p) => resolveCatId(p) === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                selectedCategory === c.id
                  ? "bg-mint-700 text-white shadow-2xs"
                  : "border border-mint-200 bg-white text-ink-soft hover:bg-mint-50"
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
              <span className="opacity-70">({count})</span>
            </button>
          );
        })}

        {/* ปุ่มทางลัดไปหน้าจัดการหมวดหมู่ */}
        <Link
          href="/categories"
          className="flex shrink-0 items-center gap-1.5 rounded-2xl border-2 border-dashed border-mint-300 bg-mint-50/60 px-3.5 py-1.5 text-xs font-bold text-mint-800 hover:bg-mint-100 hover:border-mint-400 active:scale-95 transition-all"
        >
          <span>🏷️</span>
          <span>จัดการหมวดหมู่</span>
        </Link>
      </div>

      {/* ── รายการสินค้า ── */}
      <div className="space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-mint-200 p-8 text-center bg-white/50">
            <p className="text-3xl">🔍</p>
            <p className="mt-2 text-sm font-bold text-ink">ไม่พบสินค้าที่ค้นหา</p>
            <p className="mt-0.5 text-xs text-ink-soft">ลองค้นหาด้วยคำอื่น หรือกดเพิ่มสินค้าใหม่</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const cat = p.category_id ? categoryMap.get(p.category_id) : null;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-mint-200/90 bg-white p-3.5 shadow-2xs transition-all hover:border-mint-300"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint-50 text-2xl border border-mint-100">
                    <ProductIcon emoji={p.icon || p.emoji} size={28} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-soft">
                      {cat ? (
                        <span className="rounded-md bg-mint-50 px-1.5 py-0.5 text-[11px] font-semibold text-mint-800 border border-mint-100">
                          {cat.icon} {cat.name}
                        </span>
                      ) : null}
                      <span>เริ่มต้น {p.default_quantity} {p.unit}</span>
                      {p.use_count > 0 ? (
                        <span className="text-amber-600 font-medium">★ สั่ง {p.use_count} ครั้ง</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditor({ product: p })}
                    className="grid h-9 px-3 place-items-center rounded-xl border border-mint-200 bg-white text-xs font-bold text-ink hover:bg-mint-50 active:scale-95 transition-all shadow-2xs"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickArchive(p)}
                    disabled={pending}
                    title="ซ่อนสินค้านี้"
                    className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-xs text-ink-soft hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 active:scale-90 transition-all shadow-2xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Toast แจ้งเตือน ── */}
      {toast ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-ink/90 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur animate-fade-in">
          {toast}
        </div>
      ) : null}

      {/* ── Modal แก้ไข / เพิ่มสินค้า ── */}
      {editor ? (
        <ProductSheet
          product={editor.product}
          categories={categories}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
          onArchived={handleArchived}
        />
      ) : null}
    </div>
  );
}

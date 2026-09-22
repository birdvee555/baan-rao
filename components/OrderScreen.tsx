"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { Category, Product, ReorderItem } from "@/lib/types";
import { stepFor } from "@/lib/units";
import { submitOrder } from "@/lib/actions/shop";
import { categorizeProduct } from "@/lib/categories";
import { getFrequentProducts } from "@/lib/ranking";
import ProductCard from "./ProductCard";
import ProductActionMenu from "./ProductActionMenu";
import ProductSheet from "./ProductSheet";
import ReviewSheet from "./ReviewSheet";
import { useDraft } from "./useDraft";

type Props = {
  familyId: string;
  familyName?: string;
  familyCode?: string;
  member: { id?: string; name: string; avatar: string };
  greeting: string;
  categories: Category[];
  products: Product[];
  last: { label: string; count: number; items: ReorderItem[] } | null;
  active: { remaining: number; total: number } | null;
  showBackButton?: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const INITIAL_FREQUENT_LIMIT = 6; // แสดงเริ่มต้น 6 รายการในหน้าแรกสำหรับ ⭐ ซื้อบ่อย

export default function OrderScreen({
  familyId,
  familyName,
  familyCode,
  member,
  greeting,
  categories,
  products,
  last,
  active,
  showBackButton = false,
}: Props) {
  const router = useRouter();
  const { draft, setDraft } = useDraft(familyId);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editor, setEditor] = useState<{ product?: Product } | null>(null);
  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const [sent, setSent] = useState<{ count: number; name: string; avatar: string } | null>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [showAllFrequent, setShowAllFrequent] = useState(false);
  const [sending, startSend] = useTransition();

  const flash = (text: string, bad = false) => {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 2400);
  };

  // ── หมวดหมู่อื่นๆ และแมป ID หมวดหลัก ──
  const otherCat = useMemo(() => categories.find((c) => c.name === "อื่นๆ" || c.icon === "📦"), [categories]);
  const mainCatIds = useMemo(
    () => new Set(categories.filter((c) => c.name !== "อื่นๆ" && c.icon !== "📦").map((c) => c.id)),
    [categories],
  );

  const currentCategory = useMemo(() => {
    if (activeCategory === "all" || activeCategory === "frequent") return null;
    return categories.find((c) => c.id === activeCategory) || null;
  }, [categories, activeCategory]);

  // ── กรองค้นหาด่วนตามชื่อสินค้า ──
  const searchedProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, searchQuery]);

  // ── Helper แมป Category ID ให้กับสินค้า (รองรับทั้ง category_id ใน DB และ smart fallback จากชื่อ) ──
  const resolveCatId = useCallback(
    (p: Product) => {
      if (p.category_id) return p.category_id;
      return categorizeProduct(p.name, null, categories).id;
    },
    [categories],
  );

  // ── สินค้า "⭐ ซื้อบ่อย" (Smart Section / Smart Filter): use_count DESC, last_ordered_at DESC ──
  // ไม่รวมสินค้าที่ use_count = 0 (ต้องเคยซื้ออย่างน้อย 1 ครั้ง)
  const frequentProducts = useMemo(() => {
    return getFrequentProducts(searchedProducts, 1);
  }, [searchedProducts]);

  // ── ฟังก์ชันดึงสินค้าของแต่ละหมวดหมู่ (สินค้ายังคงอยู่ในหมวดเดิม ไม่ถูกดึงออกไป) ──
  const getProductsForCategory = useCallback(
    (catId: string) => {
      if (otherCat && catId === otherCat.id) {
        return searchedProducts.filter((p) => {
          const cid = resolveCatId(p);
          return !cid || cid === otherCat.id || !mainCatIds.has(cid);
        });
      }
      return searchedProducts.filter((p) => resolveCatId(p) === catId);
    },
    [searchedProducts, resolveCatId, otherCat, mainCatIds],
  );

  // ── สินค้าที่ต้องแสดงตามแท็บที่เลือก ──
  const filteredProducts = useMemo(() => {
    if (activeCategory === "frequent") {
      return frequentProducts;
    }
    if (!activeCategory || activeCategory === "all") {
      return searchedProducts;
    }
    return getProductsForCategory(activeCategory);
  }, [searchedProducts, activeCategory, frequentProducts, getProductsForCategory]);

  const selected = useMemo(
    () => products.filter((p) => draft[p.id]).map((p) => ({ product: p, entry: draft[p.id] })),
    [products, draft],
  );

  // ── แตะเลือก / ปรับจำนวน / หมายเหตุ ──
  function toggle(p: Product) {
    setDraft((d) => {
      const n = { ...d };
      if (n[p.id]) delete n[p.id];
      else n[p.id] = { q: p.default_quantity, n: p.default_note ?? "" };
      return n;
    });
  }

  function delta(p: Product, dir: 1 | -1) {
    setDraft((d) => {
      const cur = d[p.id];
      if (!cur) return d;
      const step = stepFor(p.unit);
      const q = round2(cur.q + dir * step);
      const n = { ...d };
      if (q < step) delete n[p.id];
      else n[p.id] = { ...cur, q: Math.min(q, 999) };
      return n;
    });
  }

  function remove(p: Product) {
    setDraft((d) => {
      const n = { ...d };
      delete n[p.id];
      return n;
    });
  }

  function setNote(p: Product, text: string) {
    setDraft((d) => (d[p.id] ? { ...d, [p.id]: { ...d[p.id], n: text } } : d));
  }

  // ── สั่งเหมือนครั้งที่แล้ว: รวมเข้ากับที่เลือกอยู่ และเปิดหน้าตรวจรายการทันที ──
  function reorder() {
    if (!last) return;
    const known = new Set(products.map((p) => p.id));
    const items = last.items.filter((i) => known.has(i.productId));
    if (items.length === 0) {
      flash("ของรอบที่แล้วถูกเก็บไปหมดแล้ว", true);
      return;
    }
    setDraft((d) => {
      const n = { ...d };
      for (const i of items) if (!n[i.productId]) n[i.productId] = { q: i.q, n: i.n };
      return n;
    });
    // เปิดหน้าตรวจรายการทันทีเพื่อให้ผู้ใช้ตรวจ/แก้จำนวนก่อนยืนยัน
    setReviewOpen(true);
  }

  function send() {
    if (selected.length === 0 || sending) return;
    startSend(async () => {
      const res = await submitOrder(
        selected.map(({ product, entry }) => ({
          productId: product.id,
          quantity: entry.q,
          note: entry.n,
        })),
      );
      if (res.ok) {
        setDraft({});
        setReviewOpen(false);
        setSent({ count: res.count, name: res.name, avatar: res.avatar });
        router.refresh();
      } else {
        flash(res.error, true);
      }
    });
  }

  const grid = "grid grid-cols-2 gap-3 min-[560px]:grid-cols-3";
  const card = (p: Product, keyPrefix = "prod") => (
    <ProductCard
      key={`${keyPrefix}-${p.id}`}
      product={p}
      entry={draft[p.id]}
      onToggle={() => toggle(p)}
      onDelta={(d) => delta(p, d)}
      onLongPress={() => setEditor({ product: p })}
      onMenu={() => setActionProduct(p)}
    />
  );

  function handleHideProduct(p: Product) {
    startSend(async () => {
      const { archiveProduct } = await import("@/lib/actions/shop");
      await archiveProduct(p.id);
      setDraft((d) => {
        const n = { ...d };
        delete n[p.id];
        return n;
      });
      flash(`ซ่อน ${p.name} แล้ว`);
    });
  }

  return (
    <>
      {showBackButton ? (
        <div className="mb-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-mint-200/80 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
          >
            <span className="text-base font-black text-mint-700">←</span>
            <span>หน้าหลัก</span>
          </Link>
        </div>
      ) : null}

      <header className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="บ้านต้นไผ่ & ใบหลิว"
            className="h-14 w-14 rounded-2xl object-cover shadow-sm border-2 border-mint-200"
          />
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-soft">
              <span className="text-base">🏠</span> {familyName || "บ้านต้นไผ่ & ใบหลิว"}
            </p>
            <h1 className="mt-0.5 text-xl font-bold text-ink leading-tight">
              วันนี้ซื้ออะไรดี? 🛒
            </h1>
          </div>
        </div>
      </header>

      {active && active.remaining > 0 ? (
        <Link
          href="/list"
          className="mt-4 flex items-center justify-between rounded-2xl bg-air-100 px-4 py-3 text-[15px]"
        >
          <span>
            📋 มีของต้องซื้ออยู่ <b>{active.remaining}</b> จาก {active.total} รายการ
          </span>
          <span aria-hidden>›</span>
        </Link>
      ) : null}

      <section className="mt-4">
        {/* ── แถวหัวข้อ ── */}
        <div>
          <p className="text-sm font-semibold text-ink-soft">
            {searchQuery ? `พบสินค้า ${filteredProducts.length} รายการ` : "แตะเลือกของที่ต้องการได้เลย"}
          </p>
        </div>

        {/* ── ช่องค้นหาด่วน (Quick Search Bar) ── */}
        <div className="relative mt-2.5">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3.5 text-base text-ink-soft opacity-60">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาสินค้าด่วน... เช่น หมู, ผัก, ไข่"
              className="h-12 w-full rounded-2xl border-2 border-mint-200 bg-white pl-10 pr-10 text-sm font-medium text-ink placeholder:text-ink-soft/60 outline-none focus:border-mint-500 shadow-xs transition-colors"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-bold text-ink-soft hover:bg-slate-200 active:scale-90 transition-all"
                aria-label="ล้างการค้นหา"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>

        {last && !searchQuery ? (
          <button
            type="button"
            onClick={reorder}
            className="mt-3 flex w-full items-center gap-3 rounded-3xl border-2 border-air-200 bg-air-100 px-4 py-3 text-left transition-transform active:scale-[0.98]"
          >
            <span className="text-3xl">🔄</span>
            <span>
              <span className="block text-lg font-bold">สั่งเหมือนครั้งที่แล้ว</span>
              <span className="block text-sm text-ink-soft">
                รอบ{last.label} · {last.count} รายการ
              </span>
            </span>
          </button>
        ) : null}

        {/* แถบปุ่มหมวดหมู่เลื่อนแนวนอนบนมือถือ */}
        {categories.length > 0 ? (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 pt-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              aria-pressed={activeCategory === "all"}
              className={`flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-[15px] font-bold transition-all active:scale-95 ${
                activeCategory === "all"
                  ? "border-2 border-mint-700 bg-mint-700 text-white shadow-sm"
                  : "border-2 border-mint-100 bg-white text-ink hover:border-mint-200"
              }`}
            >
              <span>✨</span>
              <span>ทั้งหมด</span>
              <span className={`ml-0.5 text-xs ${activeCategory === "all" ? "text-mint-100" : "text-ink-soft"}`}>
                ({searchedProducts.length})
              </span>
            </button>

            {/* Smart Filter: ⭐ ซื้อบ่อย (แสดงเฉพาะเมื่อมีสินค้าที่เคยซื้ออย่างน้อย 1 ครั้ง) */}
            {frequentProducts.length > 0 ? (
              <button
                type="button"
                onClick={() => setActiveCategory("frequent")}
                aria-pressed={activeCategory === "frequent"}
                className={`flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-[15px] font-bold transition-all active:scale-95 ${
                  activeCategory === "frequent"
                    ? "border-2 border-amber-600 bg-amber-600 text-white shadow-sm"
                    : "border-2 border-amber-200 bg-amber-50/80 text-amber-900 hover:border-amber-300"
                }`}
              >
                <span className="text-base leading-none">⭐</span>
                <span>ซื้อบ่อย</span>
                <span
                  className={`ml-0.5 text-xs font-semibold ${
                    activeCategory === "frequent" ? "text-amber-100" : "text-amber-700"
                  }`}
                >
                  ({frequentProducts.length})
                </span>
              </button>
            ) : null}

            {categories.map((c) => {
              const isActive = activeCategory === c.id;
              const count = getProductsForCategory(c.id).length;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategory(c.id)}
                  aria-pressed={isActive}
                  className={`flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-[15px] font-bold transition-all active:scale-95 ${
                    isActive
                      ? "border-2 border-mint-700 bg-mint-700 text-white shadow-sm"
                      : "border-2 border-mint-100 bg-white text-ink hover:border-mint-200"
                  }`}
                >
                  <span className="text-lg leading-none">{c.icon}</span>
                  <span>{c.name}</span>
                  {count > 0 ? (
                    <span className={`ml-0.5 text-xs ${isActive ? "text-mint-100" : "text-ink-soft"}`}>
                      ({count})
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {products.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-white p-6 text-center">
          <p className="text-4xl">🧺</p>
          <p className="mt-2 font-semibold">ยังไม่มีของในบ้าน</p>
          <p className="mt-1 text-sm text-ink-soft">เพิ่มครั้งเดียว ครั้งต่อไปแตะเลือกได้เลย</p>
          <button
            type="button"
            onClick={() => setEditor({})}
            className="mt-4 h-12 rounded-2xl bg-mint-700 px-6 font-bold text-white"
          >
            ＋ เพิ่มของชิ้นแรก
          </button>
        </div>
      ) : searchQuery && filteredProducts.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-mint-200 bg-white/70 p-6 text-center">
          <p className="text-4xl">🔍</p>
          <p className="mt-2 font-bold text-ink">ไม่พบ &ldquo;{searchQuery}&rdquo;</p>
          <p className="mt-1 text-xs text-ink-soft">ยังไม่มีสินค้านี้ในบ้าน ต้องการเพิ่มใหม่ไหม?</p>
          <button
            type="button"
            onClick={() => {
              const prefill = searchQuery.trim();
              setSearchQuery("");
              setEditor({ product: { id: "", name: prefill, emoji: "🛒", unit: "ชิ้น", default_quantity: 1, default_note: null, use_count: 0, last_ordered_at: null } });
            }}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-2xl bg-mint-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs active:bg-mint-800 transition-colors"
          >
            <span>＋</span>
            <span>เพิ่ม &ldquo;{searchQuery}&rdquo; เข้าบ้าน</span>
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-mint-100 bg-white p-6 text-center">
          <p className="text-4xl">{currentCategory?.icon || "🧺"}</p>
          <p className="mt-2 font-semibold text-ink">
            ยังไม่มีสินค้าในหมวด{currentCategory?.name || ""}
          </p>
          <p className="mt-1 text-sm text-ink-soft">แตะปุ่มด้านล่างเพื่อเพิ่มของเข้าหมวดนี้</p>
          <button
            type="button"
            onClick={() => setEditor({ product: undefined })}
            className="mt-4 h-11 rounded-2xl bg-mint-700 px-5 text-sm font-bold text-white active:bg-mint-600 shadow-sm"
          >
            ＋ เพิ่มของในหมวด{currentCategory?.name || ""}
          </button>
        </div>
      ) : searchQuery ? (
        <section className="mt-5">
          <p className="mb-3 text-sm font-semibold text-ink-soft">
            ผลการค้นหา &ldquo;{searchQuery}&rdquo; ({filteredProducts.length})
          </p>
          <div className={grid}>{filteredProducts.map((p) => card(p, "search"))}</div>
        </section>
      ) : activeCategory === "frequent" ? (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
              <span className="text-xl">⭐</span>
              <span>ซื้อบ่อย</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                {frequentProducts.length}
              </span>
            </h3>
          </div>
          <div className={grid}>{frequentProducts.map((p) => card(p, "frequent-only"))}</div>
        </section>
      ) : activeCategory !== "all" ? (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
              <span className="text-xl">{currentCategory?.icon}</span>
              <span>{currentCategory?.name}</span>
              <span className="rounded-full border border-mint-200 bg-mint-50 px-2 py-0.5 text-xs font-semibold text-ink-soft">
                {filteredProducts.length}
              </span>
            </h3>
          </div>
          <div className={grid}>
            {filteredProducts.map((p) => card(p, `single-${currentCategory?.id}`))}
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {/* Smart Section: ⭐ ซื้อบ่อย (แสดงด้านบนสุดในหน้าแรก) */}
          {frequentProducts.length > 0 ? (
            <section className="mt-5 rounded-3xl border border-amber-200/70 bg-gradient-to-b from-amber-50/50 to-white/60 p-3.5 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⭐</span>
                  <h3 className="text-lg font-bold text-ink">ซื้อบ่อย</h3>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    {frequentProducts.length}
                  </span>
                </div>
                {frequentProducts.length > INITIAL_FREQUENT_LIMIT ? (
                  <button
                    type="button"
                    onClick={() => setShowAllFrequent((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-white px-2.5 py-1 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-50/50 active:scale-95 transition-all"
                  >
                    <span>
                      {showAllFrequent ? "แสดง 6 รายการ" : `ดูทั้งหมด (${frequentProducts.length})`}
                    </span>
                    <span className="text-sm">{showAllFrequent ? "▴" : "›"}</span>
                  </button>
                ) : null}
              </div>
              <div className={grid}>
                {(showAllFrequent
                  ? frequentProducts
                  : frequentProducts.slice(0, INITIAL_FREQUENT_LIMIT)
                ).map((p) => card(p, "frequent-home"))}
              </div>
            </section>
          ) : null}

          {/* แสดงสินค้าแยกตามหมวดหมู่หลัก (ผัก, ของสด, ผลไม้, อื่นๆ) */}
          {categories.map((cat) => {
            const catProducts = getProductsForCategory(cat.id);
            if (catProducts.length === 0) return null;

            return (
              <section key={cat.id} className="pt-1">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
                    <span className="text-xl">{cat.icon}</span>
                    <span>{cat.name}</span>
                    <span className="rounded-full border border-mint-200 bg-mint-50 px-2 py-0.5 text-xs font-semibold text-ink-soft">
                      {catProducts.length}
                    </span>
                  </h3>
                </div>
                <div className={grid}>
                  {catProducts.map((p) => card(p, `cat-${cat.id}`))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {products.length > 0 ? (
        <p className="mt-6 text-center text-xs text-ink-soft">กดค้างที่ของเพื่อแก้ไข</p>
      ) : null}
      <p className="mt-3 flex flex-wrap justify-center">
        <Link href="/history" className="inline-block px-4 py-3 text-sm text-ink-soft underline">
          📖 ประวัติการสั่ง
        </Link>
        <Link href="/notify" className="inline-block px-4 py-3 text-sm text-ink-soft underline">
          🔔 แจ้งเตือน
        </Link>
      </p>

      {/* แถบส่งรายการติดล่างจอ — เห็นตลอดไม่ต้องเลื่อนไปสุดหน้า */}
      {selected.length > 0 ? (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 px-3 pb-2">
          <div className="mx-auto flex max-w-xl animate-slide items-center gap-2 rounded-3xl border-2 border-mint-200 bg-white p-2 shadow-lg">
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="h-14 shrink-0 rounded-2xl bg-mint-100 px-4 font-semibold text-mint-800 transition-colors hover:bg-mint-200"
            >
              📋 {selected.length}
            </button>
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              className="h-14 flex-1 rounded-2xl bg-mint-700 text-lg font-bold text-white transition-transform active:scale-[0.98] active:bg-mint-800 shadow-md flex items-center justify-center gap-2"
            >
              <span>🛒 ตรวจสอบและส่งรายการ</span>
            </button>
          </div>
        </div>
      ) : null}

      {reviewOpen ? (
        <ReviewSheet
          rows={selected}
          sending={sending}
          onDelta={delta}
          onRemove={remove}
          onNote={setNote}
          onClear={() => {
            setDraft({});
            setReviewOpen(false);
          }}
          onSend={send}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}

      {editor ? (
        <ProductSheet
          product={editor.product}
          categories={categories}
          onClose={() => setEditor(null)}
          onSaved={(p, isNew) => {
            setEditor(null);
            if (isNew) {
              // ของที่เพิ่งเพิ่ม = ตั้งใจจะซื้อ ติ๊กเลือกให้เลย
              setDraft((d) => ({ ...d, [p.id]: { q: p.default_quantity, n: p.default_note ?? "" } }));
              flash(`เพิ่ม ${p.name} แล้ว ✓`);
            } else {
              flash("บันทึกแล้ว ✓");
            }
          }}
          onArchived={(id, name) => {
            setEditor(null);
            setDraft((d) => {
              const n = { ...d };
              delete n[id];
              return n;
            });
            flash(`เก็บ ${name} แล้ว`);
          }}
        />
      ) : null}

      {actionProduct ? (
        <ProductActionMenu
          product={actionProduct}
          onClose={() => setActionProduct(null)}
          onEdit={() => setEditor({ product: actionProduct })}
          onHide={() => handleHideProduct(actionProduct)}
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          className={`fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90%] animate-slide rounded-full px-5 py-2.5 text-sm font-semibold ${
            toast.bad ? "bg-rose-soft text-rose-ink" : "bg-ink text-white"
          }`}
        >
          {toast.text}
        </div>
      ) : null}

      {sent ? (
        <div className="fixed inset-0 z-50 grid animate-fade place-items-center bg-cream/95 px-6">
          <div className="w-full max-w-sm rounded-3xl border-2 border-mint-200 bg-white p-8 text-center shadow-xl animate-pop">
            <div className="text-7xl">💚</div>
            <h2 className="mt-4 text-2xl font-bold text-ink">สั่งของแล้ว</h2>
            <p className="mt-2 text-base text-ink-soft">
              บันทึกรายการสั่ง <b>{sent.count}</b> รายการเรียบร้อยแล้ว
            </p>
            <button
              type="button"
              onClick={() => router.push("/list")}
              className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-mint-700 text-lg font-bold text-white shadow-md active:scale-[0.98] active:bg-mint-800 transition-transform"
            >
              <span>📋</span>
              <span>ดูรายการที่ต้องซื้อ</span>
            </button>
            <button
              type="button"
              onClick={() => setSent(null)}
              className="mt-3 h-11 w-full rounded-2xl text-sm font-semibold text-ink-soft hover:text-ink transition-colors"
            >
              อยู่หน้านี้ต่อ
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

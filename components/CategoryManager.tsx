"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Category, Product } from "@/lib/types";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/actions/categories";
import { categorizeProduct } from "@/lib/categories";

type Props = {
  initialCategories: Category[];
  products: Product[];
};

const POPULAR_EMOJIS = [
  "🥬", "🥦", "🥕", "🌽", "🍅", "🥔", "🍄", "🧄", "🧅", "🥒",
  "🥩", "🍗", "🥓", "🍳", "🍤", "🐟", "🦐", "🍖", "🌭", "🥚",
  "🍎", "🍌", "🍊", "🍇", "🍉", "🍓", "🥑", "🍍", "🥭", "🍋",
  "🍞", "🥛", "🧀", "🧈", "🥖", "🥐", "🥞", "🥪", "🎂", "🍪",
  "🍜", "🍚", "🍲", "🍝", "🥟", "🍣", "🍕", "🍔", "🌯", "🍛",
  "🥫", "🧴", "🧼", "🧻", "🧹", "🧽", "🧺", "🧊", "🧂", "📦",
  "☕", "🧃", "🥤", "🍵", "🧋", "🍫", "🍩", "🍬", "🌿", "⭐",
];

export default function CategoryManager({
  initialCategories,
  products,
}: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editing, setEditing] = useState<{ category?: Category } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("📦");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function flash(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  }

  // นับจำนวนสินค้าในแต่ละหมวดหมู่ (ใช้ resolveCatId เพื่อความแม่นยำ)
  const productCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of categories) {
      map.set(c.id, 0);
    }
    for (const p of products) {
      const catId = p.category_id || categorizeProduct(p.name, null, categories).id;
      if (map.has(catId)) {
        map.set(catId, (map.get(catId) || 0) + 1);
      } else {
        // อาจตกไปที่ 'อื่นๆ'
        const other = categories.find((c) => c.name === "อื่นๆ" || c.icon === "📦");
        if (other) {
          map.set(other.id, (map.get(other.id) || 0) + 1);
        }
      }
    }
    return map;
  }, [categories, products]);

  function openCreate() {
    setFormName("");
    setFormIcon("📦");
    setEditing({});
  }

  function openEdit(c: Category) {
    setFormName(c.name);
    setFormIcon(c.icon);
    setEditing({ category: c });
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const name = formName.trim();
    if (!name) return;

    startTransition(async () => {
      if (editing?.category) {
        // แก้ไข
        const res = await updateCategory({
          id: editing.category.id,
          name,
          icon: formIcon,
        });
        if (res.ok) {
          setCategories((prev) =>
            prev.map((c) => (c.id === res.category.id ? res.category : c))
          );
          setEditing(null);
          flash(`แก้ไขหมวดหมู่ "${res.category.name}" สำเร็จ`);
          router.refresh();
        } else {
          flash(res.error);
        }
      } else {
        // เพิ่มใหม่
        const res = await createCategory({
          name,
          icon: formIcon,
        });
        if (res.ok) {
          setCategories((prev) => [...prev, res.category]);
          setEditing(null);
          flash(`เพิ่มหมวดหมู่ "${res.category.name}" สำเร็จ`);
          router.refresh();
        } else {
          flash(res.error);
        }
      }
    });
  }

  function handleDeleteConfirm() {
    if (!deleting) return;
    const cat = deleting;
    startTransition(async () => {
      const res = await deleteCategory(cat.id);
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== cat.id));
        setDeleting(null);
        flash(`ลบหมวดหมู่ "${cat.name}" เรียบร้อยแล้ว`);
        router.refresh();
      } else {
        flash(res.error);
      }
    });
  }

  return (
    <div className="space-y-5 pt-2">
      {/* ── ปุ่มย้อนกลับ ── */}
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-2xl border border-mint-200/80 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
        >
          <span className="text-base font-black text-mint-700">←</span>
          <span>ตั้งค่า</span>
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-xs font-bold text-ink-soft shadow-2xs transition-all hover:bg-slate-50 active:scale-95"
        >
          <span>📦</span>
          <span>ไปทะเบียนสินค้า</span>
        </Link>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">🏷️ หมวดหมู่สินค้า</h1>
          <p className="mt-0.5 text-xs font-medium text-ink-soft">
            ทั้งหมด {categories.length} หมวดหมู่ในระบบ
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-mint-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-mint-800 active:scale-95"
        >
          <span>＋</span>
          <span>เพิ่มหมวดหมู่</span>
        </button>
      </div>

      {/* ── รายการหมวดหมู่ ── */}
      <div className="space-y-2.5">
        {categories.map((c) => {
          const count = productCountMap.get(c.id) ?? 0;
          return (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-mint-200/90 bg-white p-3.5 shadow-2xs transition-all hover:border-mint-300"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-mint-50 to-emerald-100 text-2xl shadow-2xs">
                  {c.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-ink truncate">
                    {c.name}
                  </h3>
                  <p className="text-xs font-medium text-ink-soft">
                    มีสินค้า {count} รายการ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="rounded-xl border border-mint-200 bg-mint-50/50 px-3 py-1.5 text-xs font-bold text-mint-700 hover:bg-mint-100 active:scale-95 transition-all"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(c)}
                  aria-label={`ลบหมวดหมู่ ${c.name}`}
                  className="grid h-8 w-8 place-items-center rounded-xl border border-rose-200 bg-rose-50/60 text-xs font-bold text-rose-600 hover:bg-rose-100 active:scale-95 transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal เพิ่ม / แก้ไขหมวดหมู่ ── */}
      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border-2 border-mint-200 bg-white p-6 shadow-xl animate-slide sm:animate-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-mint-100">
              <h2 className="text-lg font-black text-ink">
                {editing.category ? "✏️ แก้ไขหมวดหมู่" : "＋ เพิ่มหมวดหมู่ใหม่"}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-ink-soft hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* ช่องไอคอนและชื่อ */}
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  ชื่อหมวดหมู่
                </label>
                <div className="flex items-center gap-2">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-mint-200 bg-mint-50/60 text-2xl shadow-2xs">
                    {formIcon}
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="เช่น เบเกอรี่, ขนม, ของใช้"
                    className="h-12 flex-1 rounded-2xl border-2 border-mint-200 bg-white px-4 text-base font-bold text-ink placeholder:text-sm placeholder:font-normal placeholder:text-ink-soft/50 outline-none focus:border-mint-600 shadow-2xs"
                  />
                </div>
              </div>

              {/* เลือก Emoji */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-ink-soft">
                    เลือกไอคอน Emoji
                  </label>
                  <input
                    type="text"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value.slice(-2) || "📦")}
                    className="h-7 w-12 text-center text-sm border rounded-lg border-mint-200 outline-none"
                    placeholder="ไอคอน"
                  />
                </div>
                <div className="grid grid-cols-10 gap-1.5 rounded-2xl border border-mint-100 bg-mint-50/30 p-2.5 max-h-44 overflow-y-auto">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormIcon(emoji)}
                      className={`grid h-8 w-8 place-items-center rounded-xl text-lg transition-all active:scale-90 ${
                        formIcon === emoji
                          ? "bg-mint-700 text-white shadow-xs scale-110"
                          : "hover:bg-white"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* ปุ่มบันทึก / ยกเลิก */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  disabled={pending}
                  className="h-12 flex-1 rounded-2xl border-2 border-slate-200 font-bold text-ink-soft hover:bg-slate-50 active:scale-98 transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={pending || !formName.trim()}
                  className="h-12 flex-1 rounded-2xl bg-mint-700 font-bold text-white shadow-sm hover:bg-mint-800 active:scale-98 disabled:opacity-50 transition-all"
                >
                  {pending ? "กำลังบันทึก…" : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Modal ยืนยันการลบ ── */}
      {deleting ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-rose-200 bg-white p-6 shadow-xl animate-pop text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-black text-ink">
              ยืนยันการลบหมวดหมู่ "{deleting.name}"?
            </h3>
            <p className="mt-2 text-xs text-ink-soft leading-relaxed">
              มีสินค้าในหมวดหมู่นี้{" "}
              <b>{productCountMap.get(deleting.id) ?? 0}</b> รายการ
              <br />
              สินค้าทั้งหมดจะถูกย้ายไปที่หมวด{" "}
              <b className="text-mint-700">"อื่นๆ"</b> โดยอัตโนมัติ
              ข้อมูลสินค้าจะไม่สูญหาย
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={pending}
                className="h-11 flex-1 rounded-2xl border-2 border-slate-200 font-bold text-ink-soft hover:bg-slate-50 active:scale-98"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={pending}
                className="h-11 flex-1 rounded-2xl bg-rose-600 font-bold text-white shadow-sm hover:bg-rose-700 active:scale-98 disabled:opacity-50"
              >
                {pending ? "กำลังลบ…" : "ยืนยันลบ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Toast แจ้งเตือน ── */}
      {toast ? (
        <div
          role="status"
          className="fixed inset-x-0 top-4 z-50 mx-auto w-fit max-w-[90%] animate-slide rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

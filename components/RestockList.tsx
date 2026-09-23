"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { RestockItem } from "@/lib/types";
import { markRestockBought, saveRestockItem } from "@/lib/actions/restock";
import { relDay, thaiDate } from "@/lib/format";

type Props = {
  initialItems: RestockItem[];
};

function getDomainBadge(link?: string | null): { icon: string; label: string; color: string } {
  if (!link) return { icon: "🛍️", label: "ทั่วไป", color: "bg-slate-100 text-slate-700" };
  const lower = link.toLowerCase();
  if (lower.includes("shopee.co.th") || lower.includes("shp.ee")) {
    return { icon: "🧡", label: "Shopee", color: "bg-orange-50 text-orange-700 border-orange-200" };
  }
  if (lower.includes("tiktok.com")) {
    return { icon: "🖤", label: "TikTok", color: "bg-zinc-100 text-zinc-900 border-zinc-300" };
  }
  if (lower.includes("lazada.co.th") || lower.includes("laz.co")) {
    return { icon: "💙", label: "Lazada", color: "bg-blue-50 text-blue-700 border-blue-200" };
  }
  return { icon: "🔗", label: "เว็บลิงก์", color: "bg-sky-50 text-sky-700 border-sky-200" };
}

export default function RestockList({ initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<RestockItem[]>(initialItems);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formNote, setFormNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function flash(text: string) {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  }

  function openCreate() {
    setFormName("");
    setFormLink("");
    setFormNote("");
    setSheetOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    startTransition(async () => {
      const res = await saveRestockItem({
        name: formName.trim(),
        link: formLink.trim() || null,
        note: formNote.trim() || null,
      });

      if (res.ok) {
        setItems((prev) => [res.item, ...prev]);
        setSheetOpen(false);
        flash(`เพิ่ม "${res.item.name}" แล้ว`);
        router.refresh();
      } else {
        flash(res.error);
      }
    });
  }

  function handleBuy(id: string, name: string) {
    startTransition(async () => {
      const res = await markRestockBought(id);
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        flash(`ซื้อ "${name}" เรียบร้อยแล้ว ✓`);
        router.refresh();
      } else {
        flash(res.error);
      }
    });
  }

  return (
    <div className="space-y-5 pt-2">
      {/* ── ปุ่มย้อนกลับ ── */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-mint-200/80 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
        >
          <span className="text-base font-black text-mint-700">←</span>
          <span>หน้าหลัก</span>
        </Link>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">🛍️ ของรอเพย์เดย์</h1>
          <p className="mt-0.5 text-xs font-medium text-ink-soft">
            {items.length > 0
              ? `รอซื้อช่วงสิ้นเดือน ${items.length} รายการ`
              : "ไม่มีของรอซื้อ"}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-mint-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-mint-800 active:scale-95"
        >
          <span>＋</span>
          <span>เพิ่มของ</span>
        </button>
      </div>

      {/* ── รายการของรอซื้อ ── */}
      <div className="space-y-2.5">
        {items.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-mint-200 p-8 text-center bg-white/50">
            <p className="text-4xl">🛍️</p>
            <p className="mt-2 text-sm font-bold text-ink">ไม่มีของรอซื้อช่วงเพย์เดย์</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              แปะลิงก์ของจาก Shopee / TikTok ที่อยากซื้อสะสมไว้ได้เลย
            </p>
          </div>
        ) : (
          items.map((it) => {
            const badge = getDomainBadge(it.link);
            return (
              <div
                key={it.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-mint-200/90 bg-white p-3.5 shadow-2xs transition-all hover:border-mint-300"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-mint-50 to-emerald-100 text-2xl shadow-2xs">
                    {badge.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-base font-bold text-ink leading-tight">
                        {it.name}
                      </h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>

                    {it.note ? (
                      <p className="mt-1 text-xs text-ink-soft">
                        {it.note}
                      </p>
                    ) : null}

                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-soft/70">
                      <span>เพิ่มเมื่อ {relDay(it.added_at)} ({thaiDate(it.added_at)})</span>
                      {it.link ? (
                        <>
                          <span>•</span>
                          <a
                            href={it.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-mint-700 underline hover:text-mint-800"
                          >
                            เปิดลิงก์ ↗
                          </a>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleBuy(it.id, it.name)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 active:scale-95 transition-all"
                  >
                    <span>✓</span>
                    <span>ซื้อแล้ว</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Sheet เพิ่มของรอเพย์เดย์ ── */}
      {sheetOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border-2 border-mint-200 bg-white p-6 shadow-xl animate-slide sm:animate-pop max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-mint-100">
              <h2 className="text-lg font-black text-ink">
                🛍️ เพิ่มของรอเพย์เดย์
              </h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-ink-soft hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  ชื่อสินค้าที่รอซื้อ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น ทิชชู่ยกลัง, น้ำยาซักผ้า, นมลูก"
                  className="h-12 w-full rounded-2xl border-2 border-mint-200 bg-white px-4 text-sm font-bold text-ink placeholder:text-ink-soft/50 outline-none focus:border-mint-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  ลิงก์สินค้า (Shopee, TikTok, หรืออื่นๆ)
                </label>
                <input
                  type="text"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  placeholder="เช่น https://shopee.co.th/... หรือ shp.ee/..."
                  className="h-11 w-full rounded-2xl border-2 border-mint-200 bg-white px-4 text-xs font-medium text-ink placeholder:text-ink-soft/50 outline-none focus:border-mint-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5">
                  หมายเหตุ (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="เช่น รอใช้โค้ดลด 50%, ซื้อ 2 แถม 1"
                  className="h-11 w-full rounded-2xl border-2 border-mint-200 bg-white px-4 text-xs font-medium text-ink placeholder:text-ink-soft/50 outline-none focus:border-mint-600 shadow-2xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  disabled={pending}
                  className="h-12 flex-1 rounded-2xl border-2 border-slate-200 font-bold text-ink-soft hover:bg-slate-50 active:scale-98"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={pending || !formName.trim()}
                  className="h-12 flex-1 rounded-2xl bg-mint-700 font-bold text-white shadow-sm hover:bg-mint-800 active:scale-98 disabled:opacity-50"
                >
                  {pending ? "กำลังบันทึก…" : "เพิ่มในรายการ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Toast ── */}
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

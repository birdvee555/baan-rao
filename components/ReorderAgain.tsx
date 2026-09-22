"use client";

import { useRouter } from "next/navigation";
import type { Draft, ReorderItem } from "@/lib/types";
import { draftKey } from "./useDraft";

/** ใส่ของรายการนี้กลับไปในตะกร้าที่กำลังเลือก (รวม ไม่ทับ) แล้วไปหน้าสั่งของให้แก้ก่อนส่ง */
export default function ReorderAgain({ familyId, items }: { familyId: string; items: ReorderItem[] }) {
  const router = useRouter();

  function go() {
    const key = draftKey(familyId);
    let cur: Draft = {};
    try {
      cur = JSON.parse(localStorage.getItem(key) || "{}") as Draft;
    } catch {
      /* เริ่มใหม่ */
    }
    for (const i of items) if (!cur[i.productId]) cur[i.productId] = { q: i.q, n: i.n };
    try {
      localStorage.setItem(key, JSON.stringify(cur));
    } catch {
      /* ข้าม */
    }
    router.push("/shopping");
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={items.length === 0}
      className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-mint-700 text-base font-bold text-white shadow-sm transition-all hover:bg-mint-800 active:scale-[0.98] disabled:opacity-50"
    >
      <span className="text-lg">🔄</span>
      <span>สั่งเหมือนครั้งนี้</span>
    </button>
  );
}

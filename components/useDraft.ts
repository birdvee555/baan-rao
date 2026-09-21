"use client";

import { useEffect, useState } from "react";
import type { Draft } from "@/lib/types";

export const draftKey = (familyId: string) => `baan-draft:${familyId}`;

/**
 * รายการที่กำลังเลือก (ก่อนกดส่ง) เก็บในเครื่อง
 * ปิดแอปหรือรีเฟรชแล้วของที่เลือกไว้ไม่หาย และไม่ต้องยิงฐานข้อมูลทุกครั้งที่แตะ
 */
export function useDraft(familyId: string) {
  const key = draftKey(familyId);
  const [draft, setDraft] = useState<Draft>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setDraft(JSON.parse(raw) as Draft);
    } catch {
      /* ใช้ค่าว่าง */
    }
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      /* โหมดส่วนตัวอาจเขียนไม่ได้ — ข้ามไป */
    }
  }, [draft, ready, key]);

  return { draft, setDraft };
}

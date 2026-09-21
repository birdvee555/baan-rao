import { cache } from "react";
import { assertAuthorized } from "./auth-gate";
import { db } from "./db";
import type { Family, Member } from "./types";

/**
 * โหลดข้อมูลครอบครัวและสมาชิกของบ้านโดยอัตโนมัติ
 * ต้องผ่านการปลดล็อกระบบด้วย APP_PASSWORD ก่อนเสมอ (ไม่เขียน DB ก่อนผ่านรหัส)
 */
export const requireMember = cache(
  async (): Promise<{ member: Member; family: Family }> => {
    // 0. ตรวจสอบสิทธิ์การเข้าถึงก่อนเป็นอันดับแรก (ห้ามแตะหรือเขียน DB ก่อนผ่านรหัส)
    await assertAuthorized();

    // 1. ดึงครอบครัวหลัก (เรียงตาม created_at ตัวแรกของระบบ)
    let { data: f } = await db()
      .from("families")
      .select("id,name,realtime_key,code")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!f) {
      // หากยังไม่มีบ้านใน DB เลย ให้สร้างบ้านเริ่มต้นให้อัตโนมัติ
      const { data: newFam } = await db()
        .from("families")
        .insert({ name: "บ้านเรา", code: "home", pin_hash: "0000:dummy" })
        .select("id,name,realtime_key,code")
        .single();
      f = newFam;
    }

    if (!f) throw new Error("ไม่พบบัญชีครอบครัวในระบบ");

    // 2. ดึงสมาชิกหลักของบ้าน (หรือสร้างให้อัตโนมัติ)
    let { data: m } = await db()
      .from("family_members")
      .select("id,name,avatar")
      .eq("family_id", f.id)
      .order("sort_order")
      .order("created_at")
      .limit(1)
      .maybeSingle();

    if (!m) {
      const { data: newMem } = await db()
        .from("family_members")
        .insert({ family_id: f.id, name: "บ้านเรา", avatar: "🏠", sort_order: 0 })
        .select("id,name,avatar")
        .single();
      m = newMem;
    }

    if (!m) throw new Error("ไม่พบสมาชิกในครอบครัว");

    return {
      member: m as Member,
      family: { ...f, name: f.name || "บ้านเรา" } as Family,
    };
  },
);

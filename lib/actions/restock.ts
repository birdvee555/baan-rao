"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "../auth";
import { db } from "../db";
import { pingFamily } from "../realtime";
import type { RestockItem } from "../types";

export type SaveRestockResult =
  | { ok: true; item: RestockItem }
  | { ok: false; error: string };

export type MarkBoughtResult =
  | { ok: true }
  | { ok: false; error: string };

async function changed(realtimeKey: string) {
  revalidatePath("/", "layout");
  revalidatePath("/restock");
  await pingFamily(realtimeKey);
}

/** บันทึกของรอเพย์เดย์ (เพิ่มหรือแก้ไข) */
export async function saveRestockItem(input: {
  id?: string;
  name: string;
  link?: string | null;
  note?: string | null;
}): Promise<SaveRestockResult> {
  const { family } = await requireMember();

  const name = String(input.name ?? "").trim().slice(0, 100);
  let link = input.link ? String(input.link).trim() : null;
  const note = input.note ? String(input.note).trim().slice(0, 200) : null;

  if (!name) return { ok: false, error: "กรุณาระบุชื่อสินค้าที่รอซื้อ" };

  if (link && !link.startsWith("http://") && !link.startsWith("https://")) {
    link = `https://${link}`;
  }

  if (input.id) {
    const { data, error } = await db()
      .from("restock_items")
      .update({ name, link, note })
      .eq("id", input.id)
      .eq("family_id", family.id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("update restock item error:", error);
      return { ok: false, error: "แก้ไขรายการไม่สำเร็จ" };
    }
    await changed(family.realtime_key);
    return { ok: true, item: data as RestockItem };
  }

  const { data, error } = await db()
    .from("restock_items")
    .insert({
      family_id: family.id,
      name,
      link,
      note,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("create restock item error:", error);
    return { ok: false, error: "เพิ่มรายการไม่สำเร็จ" };
  }

  await changed(family.realtime_key);
  return { ok: true, item: data as RestockItem };
}

/** ทำเครื่องหมายว่าซื้อแล้ว */
export async function markRestockBought(id: string): Promise<MarkBoughtResult> {
  const { family } = await requireMember();

  if (!id) return { ok: false, error: "ไม่พบรหัสรายการ" };

  const { error } = await db()
    .from("restock_items")
    .update({ bought_at: new Date().toISOString() })
    .eq("id", id)
    .eq("family_id", family.id);

  if (error) {
    console.error("mark restock bought error:", error);
    return { ok: false, error: "อัปเดตไม่สำเร็จ" };
  }

  await changed(family.realtime_key);
  return { ok: true };
}

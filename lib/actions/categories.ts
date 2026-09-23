"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "../auth";
import { db } from "../db";
import { pingFamily } from "../realtime";
import type { Category } from "../types";

export type CategoryResult =
  | { ok: true; category: Category }
  | { ok: false; error: string };

export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; error: string };

async function changed(realtimeKey: string) {
  revalidatePath("/", "layout");
  revalidatePath("/shopping");
  revalidatePath("/products");
  revalidatePath("/categories");
  revalidatePath("/settings");
  await pingFamily(realtimeKey);
}

/** สร้างหมวดหมู่ใหม่ */
export async function createCategory(input: {
  name: string;
  icon: string;
}): Promise<CategoryResult> {
  const { family } = await requireMember();

  const name = String(input.name ?? "").trim().slice(0, 40);
  const icon = String(input.icon ?? "").trim().slice(0, 10) || "📦";

  if (!name) return { ok: false, error: "กรุณาระบุชื่อหมวดหมู่" };

  // ตรวจสอบชื่อซ้ำในครอบครัว
  const { data: dup } = await db()
    .from("categories")
    .select("id")
    .eq("family_id", family.id)
    .ilike("name", name.replace(/[%_]/g, "\\$&"))
    .limit(1);

  if (dup && dup.length > 0) {
    return { ok: false, error: "มีหมวดหมู่นี้อยู่แล้ว" };
  }

  // หา sort_order ล่าสุด
  const { data: latest } = await db()
    .from("categories")
    .select("sort_order")
    .eq("family_id", family.id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (latest?.[0]?.sort_order ?? 0) + 1;

  const { data, error } = await db()
    .from("categories")
    .insert({
      family_id: family.id,
      name,
      icon,
      sort_order: nextOrder,
    })
    .select("id,family_id,name,icon,sort_order")
    .single();

  if (error || !data) {
    console.error("Create category error:", error);
    return { ok: false, error: "บันทึกหมวดหมู่ไม่สำเร็จ" };
  }

  await changed(family.realtime_key);
  return { ok: true, category: data as Category };
}

/** แก้ไขหมวดหมู่ */
export async function updateCategory(input: {
  id: string;
  name: string;
  icon: string;
}): Promise<CategoryResult> {
  const { family } = await requireMember();

  const id = input.id;
  const name = String(input.name ?? "").trim().slice(0, 40);
  const icon = String(input.icon ?? "").trim().slice(0, 10) || "📦";

  if (!id) return { ok: false, error: "ไม่พบรหัสหมวดหมู่" };
  if (!name) return { ok: false, error: "กรุณาระบุชื่อหมวดหมู่" };

  // ตรวจสอบชื่อซ้ำกับหมวดอื่น
  const { data: dup } = await db()
    .from("categories")
    .select("id")
    .eq("family_id", family.id)
    .ilike("name", name.replace(/[%_]/g, "\\$&"))
    .neq("id", id)
    .limit(1);

  if (dup && dup.length > 0) {
    return { ok: false, error: "มีหมวดหมู่นี้อยู่แล้ว" };
  }

  const { data, error } = await db()
    .from("categories")
    .update({
      name,
      icon,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("family_id", family.id)
    .select("id,family_id,name,icon,sort_order")
    .single();

  if (error || !data) {
    console.error("Update category error:", error);
    return { ok: false, error: "แก้ไขหมวดหมู่ไม่สำเร็จ" };
  }

  await changed(family.realtime_key);
  return { ok: true, category: data as Category };
}

/** ลบหมวดหมู่ (ย้ายสินค้าเดิมไปหมวด 'อื่นๆ' หรือ null เพื่อความปลอดภัย) */
export async function deleteCategory(id: string): Promise<DeleteCategoryResult> {
  const { family } = await requireMember();

  if (!id) return { ok: false, error: "ไม่พบรหัสหมวดหมู่" };

  // ตรวจสอบว่าหมวดนี้เป็นของครอบครัวจริงหรือไม่
  const { data: target } = await db()
    .from("categories")
    .select("id,name")
    .eq("id", id)
    .eq("family_id", family.id)
    .single();

  if (!target) return { ok: false, error: "ไม่พบหมวดหมู่ที่ต้องการลบ" };

  // หาหมวด 'อื่นๆ' ของครอบครัว เพื่อย้ายสินค้าไปไว้ที่นั่น (ถ้ามี)
  const { data: otherCat } = await db()
    .from("categories")
    .select("id")
    .eq("family_id", family.id)
    .neq("id", id)
    .or("name.eq.อื่นๆ,icon.eq.📦")
    .limit(1)
    .maybeSingle();

  const fallbackId = otherCat?.id ?? null;

  // ย้ายสินค้าในหมวดที่กำลังจะลบ ไปที่ fallbackId
  await db()
    .from("products")
    .update({ category_id: fallbackId })
    .eq("family_id", family.id)
    .eq("category_id", id);

  // ลบหมวดหมู่
  const { error } = await db()
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);

  if (error) {
    console.error("Delete category error:", error);
    return { ok: false, error: "ลบหมวดหมู่ไม่สำเร็จ" };
  }

  await changed(family.realtime_key);
  return { ok: true };
}

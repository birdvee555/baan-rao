"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "../auth";
import { db } from "../db";
import { pingFamily } from "../realtime";
import {
  buildCancelOrderMessage,
  buildEditMessage,
  buildRemoveMessage,
  notifyBuyers,
  notifyOthers,
} from "../telegram";
import { getFamilyTelegramConfig } from "../telegram-config";
import type { Product } from "../types";
import { UNITS } from "../units";
import { determineProductIcon } from "../emoji";

export type SendInput = { productId: string; quantity: number; note: string };
export type SendResult =
  | { ok: true; count: number; name: string; avatar: string; orderNo?: string | null }
  | { ok: false; error: string };

const okQty = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n > 0 && n <= 999;

async function changed(realtimeKey: string) {
  revalidatePath("/", "layout");
  await pingFamily(realtimeKey);
}

/** ส่งรายการ: สร้าง/รวมเข้ารายการกำลังซื้อ + เพิ่ม use_count (ทำใน SQL function ทรานแซกชันเดียว) */
export async function submitOrder(input: SendInput[]): Promise<SendResult> {
  const { member, family } = await requireMember();

  const items = (Array.isArray(input) ? input : [])
    .filter((i) => typeof i?.productId === "string" && okQty(i.quantity))
    .slice(0, 100)
    .map((i) => ({
      product_id: i.productId,
      quantity: i.quantity,
      note: String(i.note ?? "").slice(0, 200),
    }));
  if (items.length === 0) return { ok: false, error: "ยังไม่ได้เลือกของเลย" };

  const { data, error } = await db().rpc("submit_order", {
    p_family: family.id,
    p_member: member.id,
    p_items: items,
  });
  if (error || !data) return { ok: false, error: "ส่งไม่สำเร็จ ลองกดส่งอีกครั้งนะ" };

  await changed(family.realtime_key);

  // แจ้งเตือน Telegram คนอื่นในบ้าน (ไม่รวมคนสั่ง)
  const sent = items.map((i) => ({ productId: i.product_id, quantity: i.quantity, note: i.note }));
  const orderNo = (data as { order_no?: string })?.order_no || null;
  try {
    const config = await getFamilyTelegramConfig(family.id);
    if (config.isEnabled && config.botToken) {
      await notifyBuyers(family.id, member, sent, config.botToken, orderNo);
    } else {
      console.warn("[submitOrder] Telegram not sent. isEnabled:", config.isEnabled, "hasToken:", !!config.botToken, "error:", config.errorMessage);
    }
  } catch (err) {
    console.error("[submitOrder] Telegram notification error:", err);
  }

  return {
    ok: true,
    count: Number((data as { count?: number }).count || 0),
    name: member.name,
    avatar: member.avatar,
    orderNo,
  };
}

/** ติ๊ก ซื้อแล้ว / ยังไม่ได้ซื้อ */
export async function toggleItem(itemId: string, purchased: boolean): Promise<void> {
  const { family } = await requireMember();
  const { data: list } = await db()
    .from("shopping_lists")
    .select("id")
    .eq("family_id", family.id)
    .eq("status", "active")
    .maybeSingle();
  if (!list) return;

  await db()
    .from("shopping_list_items")
    .update({ is_purchased: purchased, purchased_at: purchased ? new Date().toISOString() : null })
    .eq("id", itemId)
    .eq("list_id", list.id);
  await changed(family.realtime_key);
}

/** ปิดรายการที่กำลังซื้อ (รอบถัดไปจะเริ่มใบใหม่) */
export async function completeList(): Promise<void> {
  const { family } = await requireMember();
  await db()
    .from("shopping_lists")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("family_id", family.id)
    .eq("status", "active");
  await changed(family.realtime_key);
}

export type SaveProductInput = {
  id?: string;
  categoryId?: string | null;
  name: string;
  emoji?: string;
  icon?: string;
  iconSource?: "auto" | "manual";
  unit: string;
  defaultQuantity: number;
  defaultNote: string;
};
export type SaveProductResult = { ok: true; product: Product } | { ok: false; error: string };

export async function saveProduct(input: SaveProductInput): Promise<SaveProductResult> {
  const { family } = await requireMember();

  const name = String(input.name ?? "").trim().slice(0, 60);
  const unit = UNITS.includes(input.unit) ? input.unit : (String(input.unit ?? "").trim().slice(0, 20) || "ชิ้น");
  const note = String(input.defaultNote ?? "").trim().slice(0, 100);
  const category_id = input.categoryId && !input.categoryId.startsWith("cat_") ? input.categoryId : null;
  if (!name) return { ok: false, error: "ใส่ชื่อของด้วยนะ" };
  if (!okQty(input.defaultQuantity)) return { ok: false, error: "จำนวนไม่ถูกต้อง" };

  const { data: dup } = await db()
    .from("products")
    .select("id")
    .eq("family_id", family.id)
    .is("archived_at", null)
    .ilike("name", name.replace(/[%_]/g, "\\$&"))
    .neq("id", input.id ?? "00000000-0000-0000-0000-000000000000")
    .limit(1);
  if (dup?.length) return { ok: false, error: "มีของชื่อนี้อยู่แล้ว เลือกจากรายการได้เลย" };

  // ดึงชื่อหมวดหมู่เพื่อใช้กรณี Fallback
  let categoryName: string | null = null;
  if (category_id) {
    try {
      const { data: cat } = await db().from("categories").select("name").eq("id", category_id).maybeSingle();
      categoryName = cat?.name ?? null;
    } catch {
      categoryName = null;
    }
  }

  let finalIcon = "📦";
  let iconSource: "auto" | "manual" = "auto";

  if (input.id) {
    // กำลังแก้ไขสินค้าเดิม
    let existingIcon = "";
    let existingIconSource: "auto" | "manual" = "auto";

    const { data: existingWithIcon, error: existErr } = await db()
      .from("products")
      .select("id,icon,emoji,icon_source")
      .eq("id", input.id)
      .eq("family_id", family.id)
      .maybeSingle();

    if (!existErr && existingWithIcon) {
      existingIcon = (existingWithIcon.icon as string) || (existingWithIcon.emoji as string) || "";
      existingIconSource = (existingWithIcon.icon_source as "auto" | "manual") || "auto";
    } else {
      const { data: existingBasic } = await db()
        .from("products")
        .select("id,emoji")
        .eq("id", input.id)
        .eq("family_id", family.id)
        .maybeSingle();
      if (existingBasic) {
        existingIcon = (existingBasic.emoji as string) || "";
      }
    }

    const isExplicitManual = input.iconSource === "manual" || (input.icon && input.icon !== existingIcon);

    if (isExplicitManual && input.icon) {
      // ผู้ใช้เปลี่ยน Icon เอง → บันทึกเป็น manual
      finalIcon = input.icon.trim().slice(0, 8);
      iconSource = "manual";
    } else if (existingIconSource === "manual" && existingIcon) {
      // เคยถูกเปลี่ยนเป็น manual มาก่อน → ห้าม Auto Mapping เปลี่ยนทับ
      finalIcon = existingIcon;
      iconSource = "manual";
    } else if (existingIcon) {
      finalIcon = existingIcon;
      iconSource = (input.iconSource as "auto" | "manual") || "auto";
    } else {
      // ยังเป็น auto อยู่ → คำนวณ Auto Icon ใหม่ตามชื่อและหมวดหมู่
      finalIcon = determineProductIcon(name, categoryName);
      iconSource = "auto";
    }
  } else {
    // เพิ่มสินค้าใหม่
    if (input.iconSource === "manual" && input.icon) {
      finalIcon = input.icon.trim().slice(0, 8);
      iconSource = "manual";
    } else {
      finalIcon = determineProductIcon(name, categoryName);
      iconSource = "auto";
    }
  }

  // 1. ลองบันทึกแบบ Full Columns ก่อน (หากตาราง products มีคอลัมน์ icon, category_id)
  const fullRow: Record<string, unknown> = {
    name,
    icon: finalIcon,
    emoji: finalIcon,
    icon_source: iconSource,
    unit,
    default_quantity: input.defaultQuantity,
    default_note: note || null,
    archived_at: null,
    updated_at: new Date().toISOString(),
  };
  if (category_id) {
    fullRow.category_id = category_id;
  }

  const fullSel = "id,name,emoji,icon,icon_source,category_id,unit,default_quantity,default_note,use_count,last_ordered_at";

  let res = input.id
    ? await db().from("products").update(fullRow).eq("id", input.id).eq("family_id", family.id).select(fullSel).single()
    : await db().from("products").insert({ ...fullRow, family_id: family.id }).select(fullSel).single();

  // 2. Fallback กรณีที่ DB ยังไม่มีคอลัมน์ใหม่ (ตรวจทั้ง PGRST204 จาก PostgREST และ 42703 จาก Postgres)
  if (
    res.error &&
    (res.error.code === "PGRST204" ||
      res.error.code === "42703" ||
      res.error.message?.includes("column") ||
      res.error.message?.includes("schema cache"))
  ) {
    const baseRow = {
      name,
      emoji: finalIcon,
      unit,
      default_quantity: input.defaultQuantity,
      default_note: note || null,
      archived_at: null,
      updated_at: new Date().toISOString(),
    };
    const baseSel = "id,name,emoji,unit,default_quantity,default_note,use_count,last_ordered_at";

    res = input.id
      ? await db().from("products").update(baseRow).eq("id", input.id).eq("family_id", family.id).select(baseSel).single()
      : await db().from("products").insert({ ...baseRow, family_id: family.id }).select(baseSel).single();
  }

  if (res.error || !res.data) {
    console.error("Save product error:", res.error);
    return { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }

  await changed(family.realtime_key);
  const d = res.data as Record<string, unknown>;
  return {
    ok: true,
    product: {
      id: d.id as string,
      family_id: family.id,
      name: (d.name as string) || name,
      icon: (d.icon as string) || (d.emoji as string) || finalIcon,
      emoji: (d.emoji as string) || finalIcon,
      icon_source: (d.icon_source as "auto" | "manual") || iconSource,
      category_id: (d.category_id as string) || category_id || null,
      unit: (d.unit as string) || unit,
      default_quantity: Number(d.default_quantity ?? input.defaultQuantity),
      default_note: (d.default_note as string) || null,
      use_count: Number(d.use_count ?? 0),
      last_ordered_at: (d.last_ordered_at as string) || null,
    },
  };
}

/** ซ่อนสินค้า (Soft Delete) — ใช้ archived_at เป็น Single Source of Truth */
export async function archiveProduct(id: string): Promise<void> {
  const { family } = await requireMember();
  await db()
    .from("products")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("family_id", family.id);

  await changed(family.realtime_key);
}

export const hideProduct = archiveProduct;

// ───────── แก้ / เอาออก จากรายการที่ส่งไปแล้ว ─────────
export type EditResult = { ok: true } | { ok: false; error: string };

type ActiveItem = {
  name: string;
  emoji: string;
  quantity: number;
  unit: string;
  note: string;
  isPurchased: boolean;
};

/** หารายการของใบ active ของครอบครัวนี้ (กันแก้ข้ามบ้าน/ใบที่ปิดแล้ว/ยกเลิกแล้ว) */
async function findActiveItem(familyId: string, itemId: string) {
  const { data: list } = await db()
    .from("shopping_lists")
    .select("id,order_no,status")
    .eq("family_id", familyId)
    .eq("status", "active")
    .maybeSingle();
  if (!list) return null;
  const { data: row } = await db()
    .from("shopping_list_items")
    .select("id,name_snapshot,emoji,quantity,unit,note,is_purchased")
    .eq("id", itemId)
    .eq("list_id", list.id)
    .maybeSingle();
  if (!row) return null;
  const item: ActiveItem = {
    name: row.name_snapshot,
    emoji: row.emoji,
    quantity: Number(row.quantity),
    unit: row.unit,
    note: row.note ?? "",
    isPurchased: Boolean(row.is_purchased),
  };
  return { listId: list.id as string, orderNo: (list.order_no as string | null) ?? null, item };
}

const GONE = "รายการนี้ถูกปิดหรือยกเลิกไปแล้ว";

/** แก้จำนวน/หมายเหตุ แล้วแจ้งคนอื่นในบ้าน */
export async function updateItem(itemId: string, quantity: number, note: string): Promise<EditResult> {
  const { family } = await requireMember();
  if (!okQty(quantity)) return { ok: false, error: "จำนวนไม่ถูกต้อง" };
  const newNote = String(note ?? "").trim().slice(0, 200);

  const found = await findActiveItem(family.id, itemId);
  if (!found) return { ok: false, error: GONE };
  if (found.item.quantity === quantity && found.item.note === newNote) return { ok: true };

  const { error } = await db()
    .from("shopping_list_items")
    .update({ quantity, note: newNote || null })
    .eq("id", itemId)
    .eq("list_id", found.listId);
  if (error) return { ok: false, error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" };

  await changed(family.realtime_key);

  // แจ้งเตือน Telegram การแก้ไขรายการ
  const fromQty = found.item.quantity;
  const oldItem = found.item;
  const orderNo = found.orderNo;
  try {
    const config = await getFamilyTelegramConfig(family.id);
    if (config.isEnabled && config.botToken) {
      const msg = buildEditMessage(
        orderNo,
        { name: oldItem.name, emoji: oldItem.emoji, unit: oldItem.unit },
        fromQty,
        quantity,
        oldItem.isPurchased,
        newNote !== oldItem.note ? newNote : null,
      );
      await notifyOthers(family.id, msg, config.botToken);
    }
  } catch (err) {
    console.error("[updateItem] Telegram error:", err);
  }

  return { ok: true };
}

/** เอาของออกจากรายการ (ถ้าเป็นชิ้นสุดท้าย ใบจะเปลี่ยนเป็น cancelled) */
export async function removeItem(itemId: string): Promise<EditResult> {
  const { family } = await requireMember();

  const found = await findActiveItem(family.id, itemId);
  if (!found) return { ok: false, error: GONE };

  const { data, error } = await db().rpc("remove_list_item", { p_family: family.id, p_item: itemId });
  if (error) return { ok: false, error: "เอาออกไม่สำเร็จ ลองใหม่อีกครั้ง" };
  if (!data?.ok) return { ok: false, error: GONE };

  await changed(family.realtime_key);

  // แจ้งเตือน Telegram
  const removedItem = found.item;
  const orderNo = found.orderNo;
  const listCancelled = Boolean((data as { list_cancelled?: boolean })?.list_cancelled);

  try {
    const config = await getFamilyTelegramConfig(family.id);
    if (config.isEnabled && config.botToken) {
      if (listCancelled) {
        // เอาชิ้นสุดท้ายออก = ยกเลิกทั้งใบ
        const msg = buildCancelOrderMessage(orderNo, [
          {
            name: removedItem.name,
            emoji: removedItem.emoji,
            quantity: removedItem.quantity,
            unit: removedItem.unit,
            is_purchased: removedItem.isPurchased,
          },
        ]);
        await notifyOthers(family.id, msg, config.botToken);
      } else {
        const msg = buildRemoveMessage(
          orderNo,
          {
            name: removedItem.name,
            emoji: removedItem.emoji,
            quantity: removedItem.quantity,
            unit: removedItem.unit,
          },
          removedItem.isPurchased,
        );
        await notifyOthers(family.id, msg, config.botToken);
      }
    }
  } catch (err) {
    console.error("[removeItem] Telegram error:", err);
  }

  return { ok: true };
}

/** ยกเลิกออเดอร์ทั้งใบ */
export async function cancelList(): Promise<{ ok: boolean; error?: string }> {
  const { family } = await requireMember();

  // 1. ดึงใบ active
  const { data: list } = await db()
    .from("shopping_lists")
    .select("id,order_no,status")
    .eq("family_id", family.id)
    .eq("status", "active")
    .maybeSingle();

  if (!list) {
    return { ok: false, error: "ไม่พบออเดอร์ที่กำลังสั่งอยู่ หรือออเดอร์ถูกปิด/ยกเลิกไปแล้ว" };
  }

  // 2. ดึงรายการสินค้าทั้งหมดในใบนี้ก่อนยกเลิก
  const { data: items } = await db()
    .from("shopping_list_items")
    .select("name_snapshot,emoji,quantity,unit,is_purchased")
    .eq("list_id", list.id);

  // 3. ปรับสถานะเป็น cancelled
  const { error } = await db()
    .from("shopping_lists")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", list.id)
    .eq("status", "active");

  if (error) {
    return { ok: false, error: "ยกเลิกออเดอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  await changed(family.realtime_key);

  // 4. แจ้งเตือน Telegram
  const orderNo = (list.order_no as string | null) ?? null;
  try {
    const config = await getFamilyTelegramConfig(family.id);
    if (config.isEnabled && config.botToken) {
      const notifyItems = (items ?? []).map((i) => ({
        name: i.name_snapshot as string,
        emoji: i.emoji as string,
        quantity: Number(i.quantity),
        unit: i.unit as string,
        is_purchased: Boolean(i.is_purchased),
      }));
      const msg = buildCancelOrderMessage(orderNo, notifyItems);
      await notifyOthers(family.id, msg, config.botToken);
    }
  } catch (err) {
    console.error("[cancelList] Telegram error:", err);
  }

  return { ok: true };
}

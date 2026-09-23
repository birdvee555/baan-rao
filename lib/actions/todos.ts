"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "../auth";
import { db } from "../db";
import { pingFamily } from "../realtime";
import type { HouseTodo, TodoPriority, TodoStatus } from "../types";

export type SaveTodoResult =
  | { ok: true; todo: HouseTodo }
  | { ok: false; error: string };

export type UpdateTodoResult =
  | { ok: true }
  | { ok: false; error: string };

async function changed(realtimeKey: string) {
  revalidatePath("/", "layout");
  revalidatePath("/todos");
  await pingFamily(realtimeKey);
}

/** เพิ่มหรือแก้ไขสิ่งที่ต้องทำในบ้าน */
export async function saveTodo(input: {
  id?: string;
  personId?: string | null;
  title: string;
  note?: string | null;
  category?: string | null;
  priority?: TodoPriority;
  dueDate?: string | null;
}): Promise<SaveTodoResult> {
  const { family } = await requireMember();

  const title = String(input.title ?? "").trim().slice(0, 200);
  if (!title) return { ok: false, error: "กรุณาระบุสิ่งที่ต้องทำ" };

  const note = input.note ? String(input.note).trim().slice(0, 500) : null;
  const category = input.category ? String(input.category).trim().slice(0, 50) : null;
  const priority: TodoPriority = input.priority && ["low", "normal", "high", "urgent"].includes(input.priority)
    ? input.priority
    : "normal";
  const personId = input.personId && input.personId.trim() ? input.personId.trim() : null;
  const dueDate = input.dueDate && input.dueDate.trim() ? input.dueDate.trim() : null;

  if (input.id) {
    const { data, error } = await db()
      .from("house_todos")
      .update({
        person_id: personId,
        title,
        note,
        category,
        priority,
        due_date: dueDate,
      })
      .eq("id", input.id)
      .eq("family_id", family.id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("update house_todo error:", error);
      return { ok: false, error: "แก้ไขรายการไม่สำเร็จ" };
    }
    await changed(family.realtime_key);
    return { ok: true, todo: data as HouseTodo };
  }

  const { data, error } = await db()
    .from("house_todos")
    .insert({
      family_id: family.id,
      person_id: personId,
      title,
      note,
      category,
      priority,
      due_date: dueDate,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("insert house_todo error:", error);
    return { ok: false, error: "บันทึกรายการไม่สำเร็จ" };
  }
  await changed(family.realtime_key);
  return { ok: true, todo: data as HouseTodo };
}

/** เปลี่ยนสถานะ (pending <-> done) */
export async function toggleTodoStatus(
  id: string,
  status: TodoStatus,
): Promise<UpdateTodoResult> {
  const { family } = await requireMember();

  const completedAt = status === "done" ? new Date().toISOString() : null;

  const { error } = await db()
    .from("house_todos")
    .update({
      status,
      completed_at: completedAt,
    })
    .eq("id", id)
    .eq("family_id", family.id);

  if (error) {
    console.error("toggle house_todo status error:", error);
    return { ok: false, error: "อัปเดตสถานะไม่สำเร็จ" };
  }

  await changed(family.realtime_key);
  return { ok: true };
}

/** ลบรายการสิ่งที่ต้องทำ */
export async function deleteTodo(id: string): Promise<UpdateTodoResult> {
  const { family } = await requireMember();

  const { error } = await db()
    .from("house_todos")
    .delete()
    .eq("id", id)
    .eq("family_id", family.id);

  if (error) {
    console.error("delete house_todo error:", error);
    return { ok: false, error: "ลบรายการไม่สำเร็จ" };
  }

  await changed(family.realtime_key);
  return { ok: true };
}

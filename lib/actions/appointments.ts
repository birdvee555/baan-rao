"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "../auth";
import { db } from "../db";
import { pingFamily } from "../realtime";
import type { Appointment, Person } from "../types";

export type SavePersonResult =
  | { ok: true; person: Person }
  | { ok: false; error: string };

export type SaveAppointmentResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; error: string };

export type UpdateStatusResult =
  | { ok: true }
  | { ok: false; error: string };

async function changed(realtimeKey: string) {
  revalidatePath("/", "layout");
  revalidatePath("/appointments");
  await pingFamily(realtimeKey);
}

/** บันทึกคนในบ้าน (เพิ่มหรือแก้ไข) */
export async function savePerson(input: {
  id?: string;
  name: string;
  avatar?: string;
  kind?: "child" | "adult";
}): Promise<SavePersonResult> {
  const { family } = await requireMember();

  const name = String(input.name ?? "").trim().slice(0, 50);
  const avatar = String(input.avatar ?? "").trim() || (input.kind === "adult" ? "🧑" : "🧒");
  const kind = input.kind === "adult" ? "adult" : "child";

  if (!name) return { ok: false, error: "กรุณากรอกชื่อคนในบ้าน" };

  if (input.id) {
    const { data, error } = await db()
      .from("people")
      .update({ name, avatar, kind })
      .eq("id", input.id)
      .eq("family_id", family.id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("update person error:", error);
      return { ok: false, error: "แก้ไขข้อมูลคนในบ้านไม่สำเร็จ" };
    }
    await changed(family.realtime_key);
    return { ok: true, person: data as Person };
  }

  const { data, error } = await db()
    .from("people")
    .insert({
      family_id: family.id,
      name,
      avatar,
      kind,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("create person error:", error);
    return { ok: false, error: "เพิ่มคนในบ้านไม่สำเร็จ" };
  }

  await changed(family.realtime_key);
  return { ok: true, person: data as Person };
}

/** บันทึกนัดหมาย (เพิ่มหรือแก้ไข) */
export async function saveAppointment(input: {
  id?: string;
  personId: string;
  title: string;
  category?: string | null;
  appointmentAt: string;
  location?: string | null;
  note?: string | null;
  remindBeforeHours?: number | null;
}): Promise<SaveAppointmentResult> {
  const { family } = await requireMember();

  const title = String(input.title ?? "").trim().slice(0, 100);
  const personId = String(input.personId ?? "").trim();
  const appointmentAt = new Date(input.appointmentAt).toISOString();
  const category = input.category ? String(input.category).trim().slice(0, 30) : null;
  const location = input.location ? String(input.location).trim().slice(0, 150) : null;
  const note = input.note ? String(input.note).trim().slice(0, 300) : null;
  const remindBeforeHours =
    typeof input.remindBeforeHours === "number" && input.remindBeforeHours > 0
      ? input.remindBeforeHours
      : null;

  if (!title) return { ok: false, error: "กรุณาระบุหัวข้อนัดหมาย" };
  if (!personId) return { ok: false, error: "กรุณาเลือกคนในบ้านสำหรับนัดนี้" };
  if (isNaN(new Date(input.appointmentAt).getTime())) {
    return { ok: false, error: "วันเวลาไม่ถูกต้อง" };
  }

  if (input.id) {
    const { data, error } = await db()
      .from("appointments")
      .update({
        person_id: personId,
        title,
        category,
        appointment_at: appointmentAt,
        location,
        note,
        remind_before_hours: remindBeforeHours,
      })
      .eq("id", input.id)
      .eq("family_id", family.id)
      .select("*")
      .single();

    if (error || !data) {
      console.error("update appointment error:", error);
      return { ok: false, error: "แก้ไขนัดหมายไม่สำเร็จ" };
    }
    await changed(family.realtime_key);
    return { ok: true, appointment: data as Appointment };
  }

  const { data, error } = await db()
    .from("appointments")
    .insert({
      family_id: family.id,
      person_id: personId,
      title,
      category,
      appointment_at: appointmentAt,
      location,
      note,
      remind_before_hours: remindBeforeHours,
      status: "upcoming",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("create appointment error:", error);
    return { ok: false, error: "สร้างนัดหมายไม่สำเร็จ" };
  }

  await changed(family.realtime_key);
  return { ok: true, appointment: data as Appointment };
}

/** ปรับสถานะนัดหมาย (เสร็จแล้ว หรือ ยกเลิก) */
export async function updateAppointmentStatus(
  id: string,
  status: "done" | "cancelled",
): Promise<UpdateStatusResult> {
  const { family } = await requireMember();

  if (!id) return { ok: false, error: "ไม่พบรหัสนัดหมาย" };
  if (status !== "done" && status !== "cancelled") {
    return { ok: false, error: "สถานะไม่ถูกต้อง" };
  }

  const { error } = await db()
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .eq("family_id", family.id);

  if (error) {
    console.error("update status error:", error);
    return { ok: false, error: "อัปเดตสถานะไม่สำเร็จ" };
  }

  await changed(family.realtime_key);
  return { ok: true };
}

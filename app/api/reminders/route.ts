import { db } from "@/lib/db";
import { relDay, thaiDate, thaiTime } from "@/lib/format";
import { notifyOthers } from "@/lib/telegram";
import { getFamilyTelegramConfig } from "@/lib/telegram-config";

export const dynamic = "force-dynamic";

/**
 * แจ้งเตือนอัตโนมัติ: รันผ่าน Cron Job ทุกชั่วโมง
 * 1. นัดหมาย (Appointments): เตือนก่อนถึงเวลานัดตาม remind_before_hours
 * 2. ของรอเพย์เดย์ (Restock Items): เตือนทุกวันที่ 25 ของเดือน (Asia/Bangkok)
 *
 * การตรวจสอบสิทธิ์: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "CRON_SECRET not set" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  let appointmentsSent = 0;
  let paydaysSent = 0;
  const errors: string[] = [];

  // ───────── 1. แจ้งเตือนนัดหมาย (Appointments) ─────────
  try {
    const { data: upcomingAppts, error: apptErr } = await db()
      .from("appointments")
      .select(`
        id,
        family_id,
        title,
        category,
        appointment_at,
        location,
        note,
        remind_before_hours,
        person:people (
          id,
          name,
          avatar,
          kind
        )
      `)
      .eq("status", "upcoming")
      .is("reminded_at", null)
      .not("remind_before_hours", "is", null)
      .gt("appointment_at", nowIso);

    if (apptErr) {
      errors.push(`Appointments query error: ${apptErr.message}`);
    } else if (upcomingAppts && upcomingAppts.length > 0) {
      for (const a of upcomingAppts) {
        const apptTime = new Date(a.appointment_at).getTime();
        const remindHours = Number(a.remind_before_hours);
        if (Number.isNaN(remindHours) || remindHours <= 0) continue;

        const windowStart = apptTime - remindHours * 3600 * 1000;
        // หากถึงช่วงเวลาเตือนแล้ว และยังไม่เลยเวลานัด
        if (now.getTime() >= windowStart && now.getTime() < apptTime) {
          try {
            const rawPerson = a.person;
            const person = Array.isArray(rawPerson) ? rawPerson[0] : rawPerson;
            const personName = person?.name || "คนในบ้าน";
            const personAvatar = person?.avatar || "🧒";
            const timeStr = thaiTime(a.appointment_at);
            const dateStr = thaiDate(a.appointment_at);
            const relStr = relDay(a.appointment_at, now);
            const appUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, "") : "";

            const lines = [
              "📅 แจ้งเตือนนัดหมาย",
              "",
              `👤 ${personName} (${personAvatar})`,
              `📌 ${a.title}`,
              `🕒 ${relStr} (${dateStr}) เวลา ${timeStr} น.`,
            ];
            if (a.category) {
              lines.push(`🏷️ หมวดหมู่: ${a.category}`);
            }
            if (a.location) {
              lines.push(`📍 สถานที่: ${a.location}`);
            }
            if (a.note) {
              lines.push(`📝 หมายเหตุ: ${a.note}`);
            }
            if (appUrl) {
              lines.push("", `👉 ${appUrl}/appointments`);
            }

            const text = lines.join("\n");
            const tgConfig = await getFamilyTelegramConfig(a.family_id);
            if (tgConfig.isEnabled && (tgConfig.botToken || process.env.TELEGRAM_BOT_TOKEN)) {
              await notifyOthers(a.family_id, text, tgConfig.botToken || undefined);
            }

            // บันทึกว่าเตือนแล้ว เพื่อไม่ให้ส่งซ้ำ
            await db()
              .from("appointments")
              .update({ reminded_at: new Date().toISOString() })
              .eq("id", a.id);

            appointmentsSent++;
          } catch (itemErr) {
            console.error(`Error reminding appointment ${a.id}:`, itemErr);
            errors.push(`Appointment ${a.id} error: ${String(itemErr)}`);
          }
        }
      }
    }
  } catch (err) {
    console.error("Appointments reminder block error:", err);
    errors.push(`Appointments block error: ${String(err)}`);
  }

  // ───────── 2. แจ้งเตือนของรอเพย์เดย์ (Payday Restock) ─────────
  let isPayday = false;
  try {
    const bkkDateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);

    const year = bkkDateParts.find((p) => p.type === "year")?.value;
    const month = bkkDateParts.find((p) => p.type === "month")?.value;
    const day = bkkDateParts.find((p) => p.type === "day")?.value;
    isPayday = day === "25";
    const ym = `${year}-${month}`;

    if (isPayday) {
      // ดึงรายการของที่ยังไม่ได้ซื้อทั้งหมด
      const { data: unboughtItems, error: restockErr } = await db()
        .from("restock_items")
        .select("id, family_id, name")
        .is("bought_at", null)
        .order("added_at", { ascending: false });

      if (restockErr) {
        errors.push(`Restock items query error: ${restockErr.message}`);
      } else if (unboughtItems && unboughtItems.length > 0) {
        // จัดกลุ่มตาม family_id
        const familyMap = new Map<string, Array<{ id: string; name: string }>>();
        for (const item of unboughtItems) {
          const list = familyMap.get(item.family_id) || [];
          list.push({ id: item.id, name: item.name });
          familyMap.set(item.family_id, list);
        }

        for (const [familyId, items] of familyMap.entries()) {
          try {
            // ตรวจสอบว่าเดือนนี้เคยส่งแจ้งเตือนไปหรือยัง
            const { data: logEntry } = await db()
              .from("restock_reminder_log")
              .select("sent_at")
              .eq("family_id", familyId)
              .eq("ym", ym)
              .maybeSingle();

            if (!logEntry) {
              const count = items.length;
              const MAX = 15;
              const itemLines = items.slice(0, MAX).map((it) => `• ${it.name}`);
              const more = count > MAX ? `…และอีก ${count - MAX} รายการ` : "";
              const appUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, "") : "";
              const link = appUrl ? `\n\n👉 ${appUrl}/restock` : "";

              const text = [
                `🛍️ วันนี้เพย์เดย์! มีของรอช้อปเข้าบ้าน ${count} รายการ`,
                "",
                ...itemLines,
                more,
              ].filter(Boolean).join("\n") + link;

              const tgConfig = await getFamilyTelegramConfig(familyId);
              if (tgConfig.isEnabled && (tgConfig.botToken || process.env.TELEGRAM_BOT_TOKEN)) {
                await notifyOthers(familyId, text, tgConfig.botToken || undefined);
              }

              // บันทึก log กันส่งซ้ำในเดือนเดียวกัน
              await db()
                .from("restock_reminder_log")
                .insert({
                  family_id: familyId,
                  ym,
                  sent_at: new Date().toISOString(),
                });

              paydaysSent++;
            }
          } catch (famErr) {
            console.error(`Error sending payday reminder for family ${familyId}:`, famErr);
            errors.push(`Payday family ${familyId} error: ${String(famErr)}`);
          }
        }
      }
    }
  } catch (err) {
    console.error("Payday reminder block error:", err);
    errors.push(`Payday block error: ${String(err)}`);
  }

  return Response.json({
    ok: errors.length === 0,
    appointmentsSent,
    paydaysSent,
    isPayday,
    errors: errors.length > 0 ? errors : undefined,
    at: nowIso,
  });
}

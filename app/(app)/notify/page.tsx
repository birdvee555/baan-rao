import Link from "next/link";
import NotifySettings, { type NotifyMember } from "@/components/NotifySettings";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { linkCode } from "@/lib/telegram";
import { getFamilyTelegramConfig } from "@/lib/telegram-config";
import { getTelegramWebhookStatusAction } from "@/lib/actions/notify";

export default async function NotifyPage() {
  const { member, family } = await requireMember();

  let { data, error } = await db()
    .from("family_members")
    .select("id,name,avatar,telegram_chat_id,telegram_username,telegram_notifications_enabled")
    .eq("family_id", family.id)
    .order("sort_order")
    .order("created_at");

  if (error && error.code === "42703") {
    const fallback = await db()
      .from("family_members")
      .select("id,name,avatar,telegram_chat_id")
      .eq("family_id", family.id)
      .order("sort_order")
      .order("created_at");
    data = (fallback.data ?? []).map((m) => ({
      ...m,
      telegram_username: null,
      telegram_notifications_enabled: true,
    }));
  }

  const people: NotifyMember[] = (data ?? []).map((m) => ({
    id: m.id as string,
    name: m.name as string,
    avatar: m.avatar as string,
    linked: m.telegram_chat_id != null,
    username: (m.telegram_username as string | null) ?? null,
    notificationsEnabled: (m.telegram_notifications_enabled as boolean | undefined) !== false,
  }));

  const currentMember = people.find((p) => p.id === member.id) ?? {
    id: member.id,
    name: member.name,
    avatar: member.avatar,
    linked: false,
    username: null,
    notificationsEnabled: true,
  };

  const otherMembers = people.filter((p) => p.id !== member.id);

  const config = await getFamilyTelegramConfig(family.id);
  const cleanUsername = config.botUsername?.replace(/^@/, "") || "";
  const linkUrl = cleanUsername ? `https://t.me/${cleanUsername}?start=${linkCode(member.id)}` : "#";

  let initialWebhookStatus = undefined;
  if (config.isConfigured) {
    initialWebhookStatus = await getTelegramWebhookStatusAction();
  }

  const { getRecipientsAction } = await import("@/lib/actions/notify");
  const recipients = await getRecipientsAction();

  return (
    <>
      <div className="mb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-mint-200/80 bg-white px-4 py-2.5 text-sm font-bold text-ink shadow-2xs transition-all hover:bg-mint-50 hover:border-mint-300 active:scale-95 active:bg-mint-100"
        >
          <span className="text-base font-black text-mint-700">←</span>
          <span>กลับ</span>
        </Link>
      </div>
      <h1 className="text-2xl font-bold">🔔 ตั้งค่า Telegram</h1>
      <p className="mt-1 text-sm text-ink-soft leading-relaxed">
        เมื่อมีคนสั่งของ ระบบจะส่งแจ้งเตือนเข้า Telegram ของคนอื่นในบ้าน
      </p>

      <div className="mt-5">
        <NotifySettings
          isConfigured={config.isConfigured}
          isEnabled={config.isEnabled}
          botUsername={config.botUsername}
          maskedToken={config.maskedToken}
          currentMember={currentMember}
          otherMembers={otherMembers}
          linkUrl={linkUrl}
          initialWebhookStatus={initialWebhookStatus}
          recipients={recipients}
        />
      </div>
    </>
  );
}


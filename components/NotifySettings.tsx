"use client";

import { useState, useTransition } from "react";
import {
  deleteRecipientAction,
  disconnectTelegram,
  generateAddRecipientLinkAction,
  getTelegramWebhookStatusAction,
  saveTelegramSettings,
  sendTestNotification,
  setTelegramWebhookAction,
  syncRecipientsViaGetUpdatesAction,
  toggleFamilyTelegram,
  toggleNotifications,
  toggleRecipientAction,
  type RecipientItem,
  type WebhookStatusResult,
} from "@/lib/actions/notify";
import { lockApp } from "@/lib/actions/auth";

export type NotifyMember = {
  id: string;
  name: string;
  avatar: string;
  linked: boolean;
  username: string | null;
  notificationsEnabled: boolean;
};

type Props = {
  isConfigured: boolean;
  isEnabled: boolean;
  botUsername: string | null;
  maskedToken: string | null;
  currentMember: NotifyMember;
  otherMembers: NotifyMember[];
  linkUrl: string;
  initialWebhookStatus?: WebhookStatusResult;
  recipients?: RecipientItem[];
};

export default function NotifySettings({
  isConfigured,
  isEnabled: initialIsEnabled,
  botUsername,
  maskedToken,
  currentMember,
  otherMembers,
  linkUrl,
  initialWebhookStatus,
  recipients: initialRecipients = [],
}: Props) {
  const [recipientList, setRecipientList] = useState<RecipientItem[]>(initialRecipients);
  const [newRecipientLabel, setNewRecipientLabel] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(!isConfigured);
  const [tokenInput, setTokenInput] = useState("");
  const [usernameInput, setUsernameInput] = useState(botUsername || "");
  const [showToken, setShowToken] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [familyEnabled, setFamilyEnabled] = useState(initialIsEnabled);
  const [notificationsEnabled, setNotificationsEnabled] = useState(currentMember.notificationsEnabled);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [webhookStatus, setWebhookStatus] = useState<WebhookStatusResult | undefined>(initialWebhookStatus);
  const [webhookResult, setWebhookResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);

  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);

    const token = tokenInput.trim();
    if (!token && !isConfigured) {
      setSaveError("กรุณากรอก Bot Token");
      return;
    }

    startTransition(async () => {
      const res = await saveTelegramSettings(token, usernameInput);
      if (res.ok) {
        setTokenInput("");
        setIsEditing(false);
        setSaveError(null);
        // Refresh webhook status after saving token
        const newStatus = await getTelegramWebhookStatusAction();
        setWebhookStatus(newStatus);
      } else {
        setSaveError(res.error || "บันทึกไม่สำเร็จ กรุณาตรวจสอบข้อมูล");
      }
    });
  }

  function handleToggleFamily() {
    const next = !familyEnabled;
    setFamilyEnabled(next);
    startTransition(async () => {
      await toggleFamilyTelegram(next);
    });
  }

  function handleTest() {
    setTestResult(null);
    startTransition(async () => {
      const res = await sendTestNotification();
      if (res.ok) {
        setTestResult({ ok: true, message: "🟢 ส่งข้อความทดสอบสำเร็จ! ตรวจสอบในแชท Telegram ได้เลยครับ" });
      } else {
        setTestResult({ ok: false, message: `🔴 ${res.error || "ไม่สามารถส่งข้อความได้"}` });
      }
    });
  }

  function handleToggleMemberNotifications(enabled: boolean) {
    setNotificationsEnabled(enabled);
    startTransition(async () => {
      await toggleNotifications(enabled);
    });
  }

  function handleDisconnect() {
    if (!confirm("ต้องการยกเลิกการเชื่อมต่อ Telegram ของคุณใช่หรือไม่?")) return;
    startTransition(async () => {
      await disconnectTelegram();
    });
  }

  async function handleSetWebhook() {
    setWebhookResult(null);
    setIsSettingWebhook(true);
    try {
      const res = await setTelegramWebhookAction();
      if (res.ok) {
        setWebhookResult({ ok: true, message: "🟢 " + (res.message || "ตั้งค่า Webhook สำเร็จเรียบร้อย") });
        const newStatus = await getTelegramWebhookStatusAction();
        setWebhookStatus(newStatus);
      } else {
        setWebhookResult({ ok: false, message: "🔴 " + (res.error || "ตั้งค่า Webhook ไม่สำเร็จ") });
      }
    } finally {
      setIsSettingWebhook(false);
    }
  }

  function handleToggleRecipient(id: string, enabled: boolean) {
    setRecipientList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled } : r))
    );
    startTransition(async () => {
      await toggleRecipientAction(id, enabled);
    });
  }

  function handleDeleteRecipient(id: string) {
    if (!confirm("ต้องการลบผู้รับคนนี้ออกจากการแจ้งเตือนใช่หรือไม่?")) return;
    setRecipientList((prev) => prev.filter((r) => r.id !== id));
    startTransition(async () => {
      await deleteRecipientAction(id);
    });
  }

  async function handleGenerateLink() {
    if (!newRecipientLabel.trim()) {
      alert("กรุณาใส่ชื่อเรียกของผู้รับ (เช่น คุณแม่, น้องใบหลิว)");
      return;
    }
    const res = await generateAddRecipientLinkAction(newRecipientLabel.trim());
    if (res.ok && res.link) {
      setGeneratedLink(res.link);
      setCopySuccess(false);
    } else {
      alert(res.error || "สร้างลิงก์ไม่สำเร็จ");
    }
  }

  function handleCopyLink() {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  }

  function handleSyncRecipients() {
    setSyncStatus("กำลังตรวจสอบจาก Telegram…");
    startTransition(async () => {
      const res = await syncRecipientsViaGetUpdatesAction();
      if (res.ok) {
        setSyncStatus(res.count > 0 ? `🟢 พบและเพิ่มผู้รับใหม่ ${res.count} คน!` : "ℹ️ ไม่พบผู้รับใหม่ที่เพิ่งกด START");
        // รีเฟรชรายชื่อ
        const { getRecipientsAction } = await import("@/lib/actions/notify");
        const list = await getRecipientsAction();
        setRecipientList(list);
      } else {
        setSyncStatus(`🔴 ${res.error || "ตรวจสอบไม่สำเร็จ"}`);
      }
      setTimeout(() => setSyncStatus(null), 5000);
    });
  }

  async function handleLockApp() {
    if (!confirm("ต้องการล็อกเครื่องนี้และกลับไปที่หน้ารหัสผ่านใช่หรือไม่?")) return;
    await lockApp();
  }

  return (
    <div className="space-y-4">
      {/* สถานะระบบบอทของครอบครัว */}
      <section className="rounded-3xl border-2 border-mint-100 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <div>
              <p className="text-xs font-semibold text-ink-soft">ระบบบอทแจ้งเตือนครอบครัว</p>
              <h2 className="text-base font-bold text-ink">
                {isConfigured ? (
                  familyEnabled ? (
                    <span className="text-emerald-600">🟢 พร้อมใช้งาน</span>
                  ) : (
                    <span className="text-amber-600">⚪ ปิดการแจ้งเตือนชั่วคราว</span>
                  )
                ) : (
                  <span className="text-amber-700">⚠️ ยังไม่ได้ตั้งค่า Bot Token</span>
                )}
              </h2>
            </div>
          </div>
          {isConfigured && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-xl border border-mint-200 bg-mint-50 px-3 py-1.5 text-xs font-bold text-mint-700 active:bg-mint-100 transition-colors"
            >
              ✏️ แก้ไข
            </button>
          )}
        </div>

        {/* ข้อมูลบอทเมื่อตั้งค่าแล้ว */}
        {isConfigured && !isEditing && (
          <div className="mt-4 pt-4 border-t border-mint-100/80 space-y-2.5 text-sm">
            {botUsername ? (
              <div className="flex justify-between items-center">
                <span className="text-ink-soft text-xs">Bot Username:</span>
                <span className="font-mono font-bold text-ink">{botUsername}</span>
              </div>
            ) : null}
            <div className="flex justify-between items-center">
              <span className="text-ink-soft text-xs">Bot Token:</span>
              <span className="font-mono text-xs text-ink-soft bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                {maskedToken || "••••••••••••"}
              </span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleToggleFamily}
                disabled={pending}
                className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold transition-colors border ${
                  familyEnabled
                    ? "border-rose-200 bg-rose-50 text-rose-700 active:bg-rose-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 active:bg-emerald-100"
                }`}
              >
                {familyEnabled ? "🔕 ปิดการแจ้งเตือนทั้งครอบครัว" : "🔔 เปิดการแจ้งเตือนทั้งครอบครัว"}
              </button>
            </div>
          </div>
        )}

        {/* ฟอร์มตั้งค่า / แก้ไข Bot Token & Username */}
        {isEditing && (
          <form onSubmit={handleSave} className="mt-4 pt-4 border-t border-mint-100/80 space-y-4">
            <div className="rounded-2xl bg-mint-50/70 p-3.5 text-xs text-ink-soft leading-relaxed border border-mint-100">
              <p className="font-bold text-mint-800 mb-1">💡 วิธีสร้าง Bot ใน 1 นาที:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>เปิดแอป Telegram ค้นหา <b>@BotFather</b></li>
                <li>พิมพ์คำสั่ง <b>/newbot</b> แล้วตั้งชื่อบอท</li>
                <li>คัดลอก <b>HTTP API Token</b> มาวางในช่องด้านล่าง</li>
              </ol>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Bot Token <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={
                    isConfigured
                      ? "(ใส่ Token ใหม่หากต้องการเปลี่ยน)"
                      : "เช่น 7123456789:AAHk_XYZ..."
                  }
                  required={!isConfigured}
                  className="w-full rounded-2xl border-2 border-mint-200 bg-white px-3.5 py-2.5 text-sm font-mono focus:border-mint-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft hover:text-ink"
                >
                  {showToken ? "ซ่อน" : "แสดง"}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-ink-soft">
                🔒 โทเค็นจะถูกเข้ารหัสความปลอดภัย AES-256 และเก็บเป็นความลับ
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                Bot Username (ทางเลือก)
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="เช่น @BaanRao_bot (ถ้าเว้นว่าง ระบบจะดึงให้อัตโนมัติ)"
                className="w-full rounded-2xl border-2 border-mint-200 bg-white px-3.5 py-2.5 text-sm focus:border-mint-500 focus:outline-none"
              />
            </div>

            {saveError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                🔴 {saveError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {isConfigured && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSaveError(null);
                    setTokenInput("");
                  }}
                  disabled={pending}
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-100 py-2.5 text-sm font-bold text-ink-soft active:bg-slate-200 disabled:opacity-50"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-2xl bg-mint-700 py-2.5 text-sm font-bold text-white shadow-xs active:bg-mint-800 disabled:opacity-50 transition-colors"
              >
                {pending ? "กำลังตรวจสอบและบันทึก..." : "💾 บันทึกการตั้งค่า"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ส่วนเชื่อมต่อ Telegram ของสมาชิก */}
      {isConfigured && (
        <>
          <section className="rounded-3xl border-2 border-mint-100 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{currentMember.avatar}</span>
                <div>
                  <p className="font-bold text-base text-ink">
                    {currentMember.name} <span className="text-xs font-normal text-ink-soft">(เครื่องนี้)</span>
                  </p>
                  <p className="text-xs text-ink-soft">
                    {currentMember.linked
                      ? currentMember.username
                        ? `Telegram: ${currentMember.username}`
                        : "Telegram: เชื่อมต่อแล้ว"
                      : "ยังไม่ได้เชื่อมบัญชี Telegram"}
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  currentMember.linked
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-ink-soft"
                }`}
              >
                {currentMember.linked ? "🟢 เชื่อมแล้ว" : "⚪ ยังไม่เชื่อม"}
              </span>
            </div>

            {currentMember.linked ? (
              <div className="mt-4 pt-4 border-t border-mint-100/80 space-y-3">
                {/* ตัวเลือกเปิด/ปิดแจ้งเตือน */}
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="text-sm font-semibold text-ink">
                    ☑ แจ้งเตือนเมื่อมีคนสั่งของ
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    disabled={pending}
                    onChange={(e) => handleToggleMemberNotifications(e.target.checked)}
                    className="h-5 w-5 accent-mint-600 rounded cursor-pointer"
                  />
                </label>

                {/* ปุ่มส่งข้อความทดสอบ */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={pending}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-mint-200 bg-mint-50 px-4 text-sm font-bold text-mint-700 active:bg-mint-100 disabled:opacity-50 transition-colors"
                  >
                    <span>🔔</span>
                    <span>{pending ? "กำลังส่ง…" : "ส่งข้อความทดสอบ"}</span>
                  </button>
                </div>

                {testResult ? (
                  <div
                    className={`rounded-2xl p-3 text-xs font-semibold leading-relaxed ${
                      testResult.ok
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {testResult.message}
                  </div>
                ) : null}

                {/* ยกเลิกการเชื่อมต่อ */}
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={pending}
                  className="mt-1 h-10 w-full text-center text-xs font-semibold text-rose-600/80 hover:text-rose-600 underline transition-colors"
                >
                  ยกเลิกการเชื่อมต่อ Telegram
                </button>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-mint-100/80">
                <p className="text-sm text-ink-soft leading-relaxed">
                  กดปุ่มด้านล่าง → Telegram จะเปิดขึ้นมา → กด <b>START</b> เพื่อรับแจ้งเตือนเมื่อมีคนในบ้านสั่งของ
                </p>
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-mint-700 text-base font-bold text-white shadow-md active:bg-mint-800 transition-colors"
                >
                  <span>🔔</span>
                  <span>เชื่อม Telegram</span>
                </a>
              </div>
            )}
          </section>

          {/* ส่วนตั้งค่า Telegram Webhook */}
          <section className="rounded-3xl border-2 border-mint-100 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🌐</span>
              <div>
                <h3 className="text-sm font-bold text-ink">การตั้งค่า Telegram Webhook</h3>
                <p className="text-xs text-ink-soft">รับคำสั่ง /start และการกดปุ่มจาก Telegram อัตโนมัติ</p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5 text-xs space-y-2 border border-slate-200/80">
              <div className="flex flex-col gap-0.5">
                <span className="text-ink-soft font-semibold">Webhook ปัจจุบัน:</span>
                <span className="font-mono text-ink break-all select-all">
                  {webhookStatus?.info?.url || "(ยังไม่ได้ตั้งค่า Webhook)"}
                </span>
              </div>
              <div className="flex justify-between items-center text-ink-soft">
                <span>Updates ค้างรับ:</span>
                <span className="font-bold text-ink">{webhookStatus?.info?.pending_update_count ?? 0}</span>
              </div>
              {webhookStatus?.info?.last_error_message && (
                <div className="pt-1 text-rose-600 border-t border-slate-200">
                  <span className="font-bold">ข้อผิดพลาดล่าสุด: </span>
                  {webhookStatus.info.last_error_message}
                </div>
              )}
            </div>

            {/* คำเตือนเรื่อง HTTPS และ Secret */}
            {(!webhookStatus?.isHttps || !webhookStatus?.hasWebhookSecret) && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                <p className="font-bold">⚠️ ข้อกำหนดก่อนตั้งค่า Webhook:</p>
                {!webhookStatus?.isHttps && (
                  <p>• APP_URL ต้องเป็น HTTPS (Webhook จะทำงานได้หลัง Deploy ขึ้น Vercel หรือเซิร์ฟเวอร์จริง)</p>
                )}
                {!webhookStatus?.hasWebhookSecret && (
                  <p>• ต้องกำหนด <code>TELEGRAM_WEBHOOK_SECRET</code> ใน Environment Variables</p>
                )}
              </div>
            )}

            {webhookResult && (
              <div
                className={`rounded-2xl p-3 text-xs font-semibold leading-relaxed ${
                  webhookResult.ok
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {webhookResult.message}
              </div>
            )}

            <button
              type="button"
              onClick={handleSetWebhook}
              disabled={isSettingWebhook || pending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-mint-600 bg-mint-50 px-4 text-xs font-bold text-mint-800 active:bg-mint-100 disabled:opacity-50 transition-colors"
            >
              <span>⚡</span>
              <span>{isSettingWebhook ? "กำลังตั้งค่า Webhook..." : "ตั้งค่า Webhook บนเซิร์ฟเวอร์นี้"}</span>
            </button>
          </section>

          {/* 👥 ผู้รับแจ้งเตือนหลายคน (Multi-recipients) */}
          <section className="rounded-3xl border-2 border-mint-100 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">👥</span>
                <div>
                  <h3 className="text-base font-bold text-ink">ผู้รับแจ้งเตือน Telegram</h3>
                  <p className="text-xs text-ink-soft">สามารถเพิ่มสมาชิกเพื่อรับแจ้งเตือนได้หลายคน</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSyncRecipients}
                disabled={pending}
                className="flex items-center gap-1 rounded-xl bg-mint-50 px-2.5 py-1.5 text-xs font-bold text-mint-800 border border-mint-200 hover:bg-mint-100 active:scale-95 transition-all"
              >
                <span>🔄</span>
                <span>ซิงก์ผู้รับ</span>
              </button>
            </div>

            {syncStatus ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-2.5 text-xs font-semibold text-ink">
                {syncStatus}
              </div>
            ) : null}

            {/* รายชื่อผู้รับปัจจุบัน */}
            {recipientList.length === 0 ? (
              <p className="text-xs text-ink-soft text-center py-2">ยังไม่มีผู้รับในระบบ</p>
            ) : (
              <ul className="divide-y divide-mint-100/60">
                {recipientList.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">{r.label}</p>
                      <p className="text-[11px] font-mono text-ink-soft">Chat ID: {r.chatId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleRecipient(r.id, !r.enabled)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                          r.enabled
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {r.enabled ? "เปิดแจ้งเตือน" : "ปิดชั่วคราว"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecipient(r.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 text-sm transition-colors"
                        title="ลบผู้รับ"
                      >
                        🗑
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* เพิ่มผู้รับใหม่ (สร้าง Signed Link) */}
            <div className="mt-2 pt-3 border-t border-mint-100/80 space-y-2.5">
              <p className="text-xs font-bold text-ink-soft">➕ เพิ่มผู้รับใหม่:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newRecipientLabel}
                  onChange={(e) => setNewRecipientLabel(e.target.value)}
                  placeholder="ใส่ชื่อเรียก เช่น คุณแม่, พี่ต้นไผ่"
                  className="h-10 flex-1 rounded-xl border border-mint-200 px-3 text-xs outline-none focus:border-mint-500"
                />
                <button
                  type="button"
                  onClick={handleGenerateLink}
                  className="h-10 px-3 rounded-xl bg-mint-700 text-xs font-bold text-white shadow-xs hover:bg-mint-800 active:scale-95 transition-all"
                >
                  สร้างลิงก์
                </button>
              </div>

              {generatedLink ? (
                <div className="rounded-2xl border border-mint-200 bg-mint-50/70 p-3 space-y-2 text-xs">
                  <p className="font-semibold text-mint-900">
                    🔗 ส่งลิงก์นี้ให้อีกคนเปิดบน Telegram แล้วกด START:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={generatedLink}
                      className="h-8 flex-1 rounded-lg border border-mint-200 bg-white px-2 font-mono text-[11px] text-ink select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`h-8 px-3 rounded-lg text-xs font-bold transition-colors ${
                        copySuccess ? "bg-emerald-600 text-white" : "bg-mint-700 text-white hover:bg-mint-800"
                      }`}
                    >
                      {copySuccess ? "✓ คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                  </div>
                  <p className="text-[11px] text-mint-700">
                    💡 เมื่ออีกคนกด START แล้ว ให้กดปุ่ม <b>"🔄 ซิงก์ผู้รับ"</b> ด้านบน เพื่อดึงรายชื่อเข้ามาในระบบทันที
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          {/* ส่วนสมาชิกคนอื่นในบ้าน */}
          {otherMembers.length > 0 ? (
            <section className="rounded-3xl border-2 border-mint-100 bg-white p-5 shadow-xs">
              <p className="mb-3 text-sm font-bold text-ink-soft">คนอื่นในบ้าน</p>
              <ul className="divide-y divide-mint-100/60">
                {otherMembers.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{p.avatar}</span>
                      <div>
                        <p className="text-sm font-bold text-ink">{p.name}</p>
                        {p.linked && p.username ? (
                          <p className="text-xs text-ink-soft">{p.username}</p>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        p.linked
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-ink-soft"
                      }`}
                    >
                      {p.linked ? "🟢 เชื่อมต่อแล้ว" : "⚪ ยังไม่ได้เชื่อม"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3.5 text-xs text-ink-soft leading-relaxed">
                💡 ให้สมาชิกแต่ละคนเปิดหน้านี้จากมือถือของตัวเอง (เลือกสลับเป็นชื่อตัวเองก่อน) แล้วกดเชื่อมต่อ
              </p>
            </section>
          ) : null}
        </>
      )}

      {/* ปุ่มล็อกเครื่องนี้เพื่อความปลอดภัย / ทดสอบใหม่ */}
      <section className="pt-2 pb-6 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleLockApp}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-ink-soft shadow-2xs hover:text-rose-600 hover:border-rose-200 active:bg-slate-50 transition-colors"
        >
          <span>🔒</span>
          <span>ล็อกเครื่องนี้</span>
        </button>
        <p className="text-[11px] text-ink-soft/70 text-center">
          ลบคุกกี้การปลดล็อกในเครื่องนี้ เพื่อให้ต้องใส่รหัสผ่านใหม่อีกครั้ง
        </p>
      </section>
    </div>
  );
}

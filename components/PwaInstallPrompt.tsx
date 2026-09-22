"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Props = {
  mode?: "banner" | "card";
};

export default function PwaInstallPrompt({ mode = "banner" }: Props) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(true); // default true until checked

  useEffect(() => {
    // 1. ตรวจสอบว่าแอปเปิดในโหมด Standalone (ติดตั้งไปแล้ว) หรือไม่
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);

    // 2. ตรวจสอบว่าเป็นอุปกรณ์ iOS หรือไม่
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIos(isIosDevice);

    // 3. ตรวจสอบว่าผู้ใช้เคยปิดแบนเนอร์ไปหรือยัง
    const isBannerDismissed = sessionStorage.getItem("baan_pwa_dismissed") === "true";
    setDismissed(isBannerDismissed);

    // 4. ดักจับ Event สำหรับ Android / Chrome / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  // หากติดตั้งแล้ว ไม่ต้องแสดงอะไร
  if (isStandalone) {
    if (mode === "card") {
      return (
        <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs font-semibold text-emerald-800">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-bold text-sm text-ink">ติดตั้งลงเครื่องแล้ว</p>
            <p className="text-ink-soft">แอปกำลังทำงานในโหมด Standalone เต็มหน้าจอ</p>
          </div>
        </div>
      );
    }
    return null;
  }

  // หากเป็น Banner และผู้ใช้กดปิดไปแล้ว ไม่ต้องแสดง
  if (mode === "banner" && dismissed) {
    return null;
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      // สำหรับ Android / Chrome
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      // สำหรับ iPhone / iPad
      setShowIosGuide(true);
    } else {
      // เบราว์เซอร์อื่นที่ไม่รองรับ Event โดยตรง
      setShowIosGuide(true);
    }
  }

  function handleDismiss() {
    sessionStorage.setItem("baan_pwa_dismissed", "true");
    setDismissed(true);
  }

  return (
    <>
      {/* ── Mode 1: Banner แสดงในหน้าแรก ── */}
      {mode === "banner" ? (
        <div className="relative flex items-center justify-between gap-3 rounded-3xl border-2 border-mint-200 bg-gradient-to-r from-mint-50/90 to-emerald-50/90 p-4 shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-2xl shadow-2xs border border-mint-100">
              📲
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">ติดตั้งแอปลงมือถือ</p>
              <p className="text-xs text-ink-soft truncate">เปิดเต็มจอ สะดวกเหมือนแอปจริง</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="rounded-xl bg-mint-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-mint-800 active:scale-95 transition-all"
            >
              ติดตั้ง
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="grid h-8 w-8 place-items-center rounded-full text-xs text-ink-soft/70 hover:bg-black/5 active:scale-90"
              aria-label="ปิดคำแนะนำ"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        /* ── Mode 2: Card ในหน้า Settings ── */
        <button
          type="button"
          onClick={handleInstallClick}
          className="group flex w-full items-center gap-4 rounded-3xl border-2 border-emerald-200/90 bg-white p-4 sm:p-5 text-left shadow-sm transition-all hover:border-emerald-400 hover:shadow-md active:scale-[0.98] active:bg-emerald-50/40"
        >
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-mint-100 text-2xl shadow-2xs group-hover:scale-105 transition-transform">
            📲
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink group-hover:text-emerald-800 transition-colors">
                ติดตั้งแอปลงมือถือ
              </h2>
              <span className="text-lg text-emerald-600 font-bold opacity-70 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-ink-soft">
              เพิ่มลงหน้าจอโฮมเพื่อเปิดเต็มจอเหมือนแอปจริง
            </p>
          </div>
        </button>
      )}

      {/* ── Modal วิธีติดตั้งสำหรับ iOS / Safari ── */}
      {showIosGuide ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border-2 border-mint-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📲</span>
                <h3 className="text-lg font-bold text-ink">วิธีติดตั้งลงหน้าจอมือถือ</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-bold text-ink-soft hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-ink-soft leading-relaxed">
              สำหรับ iPhone / iPad (Safari) หรือ Android ทำตาม 3 ขั้นตอนนี้ได้เลยครับ:
            </p>

            <ol className="space-y-3 text-xs font-medium text-ink">
              <li className="flex items-start gap-2.5 rounded-2xl bg-mint-50/70 p-3 border border-mint-100">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint-600 font-bold text-white text-[11px]">
                  1
                </span>
                <span>
                  แตะที่ปุ่ม <span className="font-bold text-mint-700">“แชร์”</span> (สัญลักษณ์รูปกล่องลูกศรชี้ขึ้น <b>📤</b>) ที่แถบด้านล่างของหน้าจอ
                </span>
              </li>

              <li className="flex items-start gap-2.5 rounded-2xl bg-mint-50/70 p-3 border border-mint-100">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint-600 font-bold text-white text-[11px]">
                  2
                </span>
                <span>
                  เลื่อนลงมาแล้วเลือกเมนู <span className="font-bold text-mint-700">“เพิ่มไปยังหน้าจอโฮม” (Add to Home Screen)</span> ➕
                </span>
              </li>

              <li className="flex items-start gap-2.5 rounded-2xl bg-mint-50/70 p-3 border border-mint-100">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint-600 font-bold text-white text-[11px]">
                  3
                </span>
                <span>
                  กดปุ่ม <span className="font-bold text-mint-700">“เพิ่ม” (Add)</span> ที่มุมขวาบน จะมีไอคอนแอปปรากฏบนหน้าจอมือถือทันที!
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full rounded-2xl bg-mint-700 py-3 text-sm font-bold text-white shadow-sm hover:bg-mint-800 active:scale-95 transition-all"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

/**
 * รับสัญญาณ "มีการเปลี่ยนแปลง" จากมือถือเครื่องอื่นของครอบครัว แล้วรีเฟรชข้อมูลหน้านี้
 * (สัญญาณไม่มีข้อมูลจริง — ข้อมูลยังมาจากเซิร์ฟเวอร์ที่ตรวจ PIN แล้ว)
 * สำรอง: รีเฟรชทุกครั้งที่กลับมาเปิดแอป
 */
export default function RealtimeSync({ channelKey }: { channelKey: string }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let stop = () => {};
    if (url && anon) {
      const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const channel = sb
        .channel(`family-${channelKey}`)
        .on("broadcast", { event: "changed" }, refresh)
        .subscribe();
      stop = () => {
        void sb.removeChannel(channel);
      };
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(timer);
      stop();
    };
  }, [channelKey, router]);

  return null;
}

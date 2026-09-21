"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { unlockApp } from "@/lib/actions/auth";

export default function UnlockForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("กรุณาใส่รหัสผ่าน");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await unlockApp(password);
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(res.error || "รหัสผ่านไม่ถูกต้อง");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="app-password"
          className="mb-1.5 block text-xs font-bold text-ink-soft"
        >
          รหัสผ่านแอป
        </label>
        <input
          id="app-password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          disabled={isPending}
          placeholder="ใส่รหัสผ่านที่นี่…"
          className="h-13 w-full rounded-2xl border-2 border-mint-100 bg-mint-50/40 px-4 text-center text-lg tracking-wider text-ink outline-none transition-all placeholder:text-sm placeholder:tracking-normal placeholder:text-ink-soft/50 focus:border-mint-600 focus:bg-white disabled:opacity-50"
        />
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-ink/20 bg-rose-soft/70 px-3.5 py-2.5 text-center text-xs font-bold text-rose-ink animate-shake"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !password}
        className="h-13 w-full rounded-2xl bg-mint-700 font-bold text-white shadow-sm transition-all active:scale-[0.98] active:bg-mint-800 disabled:opacity-50 disabled:active:scale-100"
      >
        {isPending ? "กำลังตรวจสอบ…" : "🔓 ปลดล็อก"}
      </button>
    </form>
  );
}

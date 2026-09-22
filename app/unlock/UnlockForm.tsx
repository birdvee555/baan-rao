"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { unlockApp } from "@/lib/actions/auth";

export default function UnlockForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          className="mb-2 block text-xs font-bold text-ink-soft"
        >
          รหัสผ่านเข้าบ้าน (6 หลัก)
        </label>
        <div className="relative flex items-center">
          <input
            id="app-password"
            type={showPassword ? "text" : "password"}
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            disabled={isPending}
            placeholder="เช่น 123456"
            className="h-14 w-full rounded-2xl border-2 border-mint-200 bg-mint-50/40 pl-4 pr-12 text-center text-xl font-bold tracking-widest text-ink outline-none transition-all placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-soft/50 focus:border-mint-600 focus:bg-white disabled:opacity-50"
          />

          {/* ปุ่มเปิด/ปิดตาดูรหัสผ่าน */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isPending}
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            className="absolute right-3.5 grid h-9 w-9 place-items-center rounded-xl text-ink-soft/70 hover:bg-mint-100/60 hover:text-ink active:scale-90 transition-all"
          >
            <span className="text-lg leading-none select-none">
              {showPassword ? "🙈" : "👁️"}
            </span>
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-ink/20 bg-rose-soft/80 px-3.5 py-2.5 text-center text-xs font-bold text-rose-ink animate-shake"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !password}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-mint-600 to-emerald-700 text-base font-bold text-white shadow-sm transition-all hover:from-mint-700 hover:to-emerald-800 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
      >
        {isPending ? (
          <>
            <span className="inline-block animate-spin text-lg">⏳</span>
            <span>กำลังตรวจสอบ…</span>
          </>
        ) : (
          <>
            <span>🔓</span>
            <span>เข้าสู่ระบบ</span>
          </>
        )}
      </button>
    </form>
  );
}

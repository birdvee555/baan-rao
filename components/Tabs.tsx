"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Tabs({ remaining }: { remaining: number }) {
  const path = usePathname();
  const tabs = [
    { href: "/", emoji: "🛒", label: "สั่งของ", on: path === "/" },
    { href: "/list", emoji: "📋", label: "ต้องซื้อ", on: path.startsWith("/list") },
  ];

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-mint-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex h-16 max-w-xl">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.on ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 text-sm ${
              t.on ? "font-bold text-mint-700" : "text-ink-soft"
            }`}
          >
            <span className="text-2xl leading-none">{t.emoji}</span>
            <span>{t.label}</span>
            {t.href === "/list" && remaining > 0 ? (
              <span className="absolute right-[28%] top-1.5 grid min-w-5 place-items-center rounded-full bg-mint-700 px-1.5 text-xs font-bold leading-5 text-white">
                {remaining}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}

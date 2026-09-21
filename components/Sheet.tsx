"use client";

import { useEffect, useRef } from "react";

/** Bottom sheet พื้นฐาน: แตะพื้นหลัง / กด Esc เพื่อปิด และล็อกการเลื่อนของหน้าหลัง */
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex animate-fade items-end justify-center bg-ink/30"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] w-full max-w-xl animate-slide overflow-y-auto overscroll-contain rounded-t-[28px] bg-cream px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3"
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-mint-200" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="h-11 w-11 rounded-full bg-white text-lg text-ink-soft"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

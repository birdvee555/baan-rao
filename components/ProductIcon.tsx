"use client";

import React from "react";

type Props = {
  emoji?: string | null;
  name?: string;
  className?: string;
  size?: number;
};

export function isImageEmoji(str?: string | null): boolean {
  if (!str) return false;
  return (
    str.startsWith("/") ||
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    str.startsWith("data:") ||
    str.endsWith(".png") ||
    str.endsWith(".webp") ||
    str.endsWith(".svg") ||
    str.endsWith(".jpg")
  );
}

export function fallbackEmoji(str?: string | null, fallback = "🥬"): string {
  if (!str) return fallback;
  if (isImageEmoji(str)) return fallback;
  return str;
}

export default function ProductIcon({ emoji, name = "", className = "", size = 44 }: Props) {
  if (isImageEmoji(emoji)) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={emoji || ""}
          alt={name}
          className="h-full w-full object-contain select-none pointer-events-none"
          style={{ maxHeight: `${size}px`, maxWidth: `${size}px` }}
        />
      </span>
    );
  }

  return <span className={className}>{emoji || "🛒"}</span>;
}

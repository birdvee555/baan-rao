"use client";

import { useRef } from "react";

/** กดค้าง ~0.55 วินาที = เรียก onLong (แตะสั้นยังเป็นแตะปกติ) */
export function useLongPress(onLong: () => void, ms = 550) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fired = useRef(false);
  const cancel = () => clearTimeout(timer.current);

  return {
    /** เรียกใน onClick: true = เพิ่งกดค้างไป ให้ข้ามการแตะครั้งนั้น */
    consumed(): boolean {
      if (fired.current) {
        fired.current = false;
        return true;
      }
      return false;
    },
    handlers: {
      onPointerDown: () => {
        fired.current = false;
        timer.current = setTimeout(() => {
          fired.current = true;
          navigator.vibrate?.(10);
          onLong();
        }, ms);
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}

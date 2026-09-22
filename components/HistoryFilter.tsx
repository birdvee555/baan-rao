"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Props = {
  availableMonths: string[]; // YYYY-MM
  selectedMonth?: string;
  searchQuery?: string;
};

function formatThaiMonth(ym: string): string {
  const [yearStr, monthStr] = ym.split("-");
  const year = parseInt(yearStr, 10) + 543;
  const month = parseInt(monthStr, 10);
  const monthNames = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  return `${monthNames[month - 1] || monthStr} ${String(year).slice(-2)}`;
}

export default function HistoryFilter({ availableMonths, selectedMonth, searchQuery }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateQuery(month: string, q: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (month) params.set("month", month);
    else params.delete("month");

    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");

    startTransition(() => {
      router.push(`/history?${params.toString()}`);
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        {/* ช่องค้นหาเลขออเดอร์ */}
        <div className="relative flex-1">
          <input
            type="search"
            defaultValue={searchQuery || ""}
            placeholder="🔎 ค้นหาเลขออเดอร์ เช่น 690901"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateQuery(selectedMonth || "", (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => updateQuery(selectedMonth || "", e.target.value)}
            className="h-11 w-full rounded-2xl border-2 border-mint-100 bg-white px-3.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-mint-500 shadow-2xs transition-colors"
          />
        </div>

        {/* เลือกเดือน */}
        {availableMonths.length > 0 ? (
          <select
            value={selectedMonth || ""}
            onChange={(e) => updateQuery(e.target.value, searchQuery || "")}
            className="h-11 rounded-2xl border-2 border-mint-100 bg-white px-3 text-xs font-bold text-ink outline-none focus:border-mint-500 shadow-2xs shrink-0"
          >
            <option value="">ทุกเดือน</option>
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>
                {formatThaiMonth(ym)}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {isPending ? <p className="text-right text-xs text-mint-700 animate-pulse">กำลังค้นหา…</p> : null}
    </div>
  );
}

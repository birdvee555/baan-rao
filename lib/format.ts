const TZ = "Asia/Bangkok";

export function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

function dayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
}

export function thaiDate(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** วันนี้ / เมื่อวาน / 3 วันก่อน / 21 ก.ย. */
export function relDay(iso: string, now: Date = new Date()): string {
  const diff = Math.round(
    (Date.parse(dayKey(now)) - Date.parse(dayKey(new Date(iso)))) / 86_400_000,
  );
  if (diff <= 0) return "วันนี้";
  if (diff === 1) return "เมื่อวาน";
  if (diff < 7) return `${diff} วันก่อน`;
  return thaiDate(iso);
}

export function greeting(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: TZ,
    }).format(now),
  );
  if (hour < 11) return "☀️ เช้านี้";
  if (hour < 16) return "🌤️ บ่ายนี้";
  if (hour < 19) return "🌇 เย็นนี้";
  return "🌙 คืนนี้";
}

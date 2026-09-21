import type { Product } from "./types";

/**
 * Smart Ranking สำหรับ "⭐ ซื้อบ่อย"
 *
 * MVP:
 * 1. เรียงตาม use_count มาก → น้อย (use_count DESC)
 * 2. ถ้า use_count เท่ากัน: เรียงตาม last_ordered_at ล่าสุดก่อน (last_ordered_at DESC)
 * 3. ถ้ายังเท่ากัน: เรียงตามชื่อภาษาไทย
 *
 * Minimum Purchase Requirement:
 * - สินค้าที่ use_count = 0 จะไม่ถูกนำมาแสดง
 * - เมื่อซื้อครั้งแรก (use_count >= 1) จึงเริ่มมีสิทธิ์เข้ามาใน ⭐ ซื้อบ่อย
 *
 * Future Smart Ranking Extension:
 * - ออกแบบโครงสร้างฟังก์ชันนี้ให้พร้อมรองรับการคำนวณคะแนน Smart Score
 *   เช่น Recency Score, Frequency Score, Purchase Intervals ในอนาคต
 */
export function getFrequentProducts(products: Product[], minPurchase = 1): Product[] {
  return products
    .filter((p) => (p.use_count ?? 0) >= minPurchase)
    .sort((a, b) => {
      // 1. เรียงตาม use_count มาก → น้อย
      const countDiff = (b.use_count ?? 0) - (a.use_count ?? 0);
      if (countDiff !== 0) return countDiff;

      // 2. ถ้า use_count เท่ากัน: เรียงตาม last_ordered_at ล่าสุดก่อน
      const timeA = a.last_ordered_at ? new Date(a.last_ordered_at).getTime() : 0;
      const timeB = b.last_ordered_at ? new Date(b.last_ordered_at).getTime() : 0;
      const timeDiff = timeB - timeA;
      if (timeDiff !== 0) return timeDiff;

      // 3. ถ้ายังเท่ากัน: เรียงตามชื่อสินค้าภาษาไทย
      return a.name.localeCompare(b.name, "th");
    });
}

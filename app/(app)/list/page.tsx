import Link from "next/link";
import Checklist, { type CheckItem } from "@/components/Checklist";
import { requireMember } from "@/lib/auth";
import { categorizeProduct } from "@/lib/categories";
import { getActive, getCategories, getProducts } from "@/lib/queries";

export default async function ListPage() {
  const { family } = await requireMember();
  const [{ list, items }, categories, products] = await Promise.all([
    getActive(family.id),
    getCategories(family.id),
    getProducts(family.id),
  ]);

  const prodById = new Map(products.map((p) => [p.id, p]));

  const checklistItems: CheckItem[] = items.map((i) => {
    const prod = i.product_id ? prodById.get(i.product_id) : undefined;
    const cat = categorizeProduct(i.name_snapshot, prod?.category_id, categories);
    return {
      id: i.id,
      name: i.name_snapshot,
      emoji: i.emoji,
      quantity: i.quantity,
      unit: i.unit,
      note: i.note,
      purchased: i.is_purchased,
      category: {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        sortOrder: cat.sort_order ?? 99,
      },
    };
  });

  return (
    <>
      <Checklist items={checklistItems} orderNo={list?.order_no} />
      <p className="mt-4 text-center">
        <Link href="/history" className="inline-block px-4 py-3 text-sm text-ink-soft underline">
          📖 ประวัติการสั่ง
        </Link>
      </p>
    </>
  );
}

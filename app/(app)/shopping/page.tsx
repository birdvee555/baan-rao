import OrderScreen from "@/components/OrderScreen";
import { requireMember } from "@/lib/auth";
import { greeting, relDay } from "@/lib/format";
import { getActive, getCategories, getLastList, getProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const { member, family } = await requireMember();
  const [categories, products, last, active] = await Promise.all([
    getCategories(family.id),
    getProducts(family.id),
    getLastList(family.id),
    getActive(family.id),
  ]);

  const lastItems = last?.items.filter((i) => i.product_id) ?? [];

  return (
    <OrderScreen
      familyId={family.id}
      familyName={family.name}
      familyCode={family.code}
      member={{ id: member.id, name: member.name, avatar: member.avatar }}
      greeting={greeting()}
      categories={categories}
      products={products}
      showBackButton={true}
      last={
        last && lastItems.length > 0
          ? {
              label: relDay(last.list.created_at),
              count: last.items.length,
              items: lastItems.map((i) => ({
                productId: i.product_id as string,
                q: i.quantity,
                n: i.note ?? "",
              })),
            }
          : null
      }
      active={
        active.list
          ? {
              remaining: active.items.filter((i) => !i.is_purchased).length,
              total: active.items.length,
            }
          : null
      }
    />
  );
}

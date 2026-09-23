import RestockList from "@/components/RestockList";
import { requireMember } from "@/lib/auth";
import { getRestockItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RestockPage() {
  const { family } = await requireMember();
  const items = await getRestockItems(family.id);

  return <RestockList initialItems={items} />;
}

import CategoryManager from "@/components/CategoryManager";
import { requireMember } from "@/lib/auth";
import { getCategories, getProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const { family } = await requireMember();
  const [categories, products] = await Promise.all([
    getCategories(family.id),
    getProducts(family.id),
  ]);

  return (
    <CategoryManager
      initialCategories={categories}
      products={products}
    />
  );
}

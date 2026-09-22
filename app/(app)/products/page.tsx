import ProductManager from "@/components/ProductManager";
import { requireMember } from "@/lib/auth";
import { getCategories, getProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { family } = await requireMember();
  const [categories, products] = await Promise.all([
    getCategories(family.id),
    getProducts(family.id),
  ]);

  return <ProductManager categories={categories} initialProducts={products} />;
}

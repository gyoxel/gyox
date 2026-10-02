import { getAllCategories } from "@/lib/repository";
import { PageHeader } from "@/components/page-header";
import { CategoryManager } from "@/components/category-manager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getAllCategories();
  return (
    <>
      <PageHeader title="Catégories" backHref="/menu" />
      <main className="flex flex-col gap-5 px-4 py-5">
        <CategoryManager categories={categories} />
      </main>
    </>
  );
}

import { listCategories } from "@/modules/categories/application/category-service";
import { AdminCategories } from "@/modules/categories/ui/admin-categories";

export default async function AdminCategoriesPage() {
  return <AdminCategories initialCategories={await listCategories()} />;
}

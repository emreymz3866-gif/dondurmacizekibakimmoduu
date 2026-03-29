import { MenuManagementClient } from "@/components/admin/menu-management-client"
import { getCatalogManagementData } from "@/data/catalog-store"
import { getMenuManagementData } from "@/data/menu-management-store"

export default async function MenuManagementPage() {
  const [data, catalog] = await Promise.all([
    getMenuManagementData(),
    getCatalogManagementData(),
  ])

  return <MenuManagementClient initialData={data} initialCatalog={catalog} />
}

export const dynamic = "force-dynamic"

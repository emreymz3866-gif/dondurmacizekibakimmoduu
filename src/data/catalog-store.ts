import "server-only"

import { prisma, runPrismaWithReconnect } from "@/lib/prisma"
import type {
  CatalogManagementData,
  CategoryFormValues,
  CategoryManagementItem,
  CategoryOption,
  MenuOption,
  ProductFormValues,
  ProductManagementItem,
} from "@/types/catalog-management"

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR")
}

function mapMenuOption(menu: {
  id: string
  name: string
  branchMenus: Array<{
    branch: {
      name: string
    }
  }>
}): MenuOption {
  return {
    id: menu.id,
    name: menu.name,
    branchName: menu.branchMenus[0]?.branch.name ?? "Sube bulunamadi",
  }
}

function mapCategory(category: {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  menuId: string
  menu: {
    name: string
  }
  _count: {
    products: number
  }
}): CategoryManagementItem {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? "",
    sortOrder: category.sortOrder,
    status: category.isActive ? "active" : "passive",
    menuId: category.menuId,
    menuName: category.menu.name,
    productCount: category._count.products,
  }
}

function mapProduct(product: {
  id: string
  name: string
  description: string | null
  price: { toNumber(): number }
  imageUrl: string
  isActive: boolean
  sortOrder: number
  categoryId: string
  category: {
    name: string
    menuId: string
    menu: {
      name: string
    }
  }
}): ProductManagementItem {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? "",
    price: product.price.toNumber(),
    imageUrl: product.imageUrl,
    status: product.isActive ? "active" : "passive",
    sortOrder: product.sortOrder,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    menuId: product.category.menuId,
    menuName: product.category.menu.name,
  }
}

async function getCategoryOptions(): Promise<CategoryOption[]> {
  const categories = await runPrismaWithReconnect((client) =>
    client.category.findMany({
      include: {
        menu: {
          select: { name: true },
        },
      },
    }),
  )

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    menuId: category.menuId,
    menuName: category.menu.name,
  }))
}

export async function getCatalogManagementData(): Promise<CatalogManagementData> {
  const { menus, categories, products, categoryOptions } = await runPrismaWithReconnect(
    async (client) => {
      const menus = await client.menu.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          branchMenus: {
            orderBy: { sortOrder: "asc" },
            include: {
              branch: {
                select: { name: true },
              },
            },
          },
        },
      })

      const categories = await client.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          menu: {
            select: { name: true },
          },
          _count: {
            select: { products: true },
          },
        },
      })

      const products = await client.product.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          category: {
            include: {
              menu: {
                select: { name: true },
              },
            },
          },
        },
      })

      const categoryOptions = await client.category.findMany({
        include: {
          menu: {
            select: { name: true },
          },
        },
      })

      return { menus, categories, products, categoryOptions }
    },
  )

  return {
    menus: menus.map(mapMenuOption),
    categories: categories.map(mapCategory),
    categoryOptions: categoryOptions.map((category) => ({
      id: category.id,
      name: category.name,
      menuId: category.menuId,
      menuName: category.menu.name,
    })),
    products: products.map(mapProduct),
  }
}

export async function createCategory(values: CategoryFormValues) {
  const category = await prisma.category.create({
    data: {
      menuId: values.menuId,
      name: values.name,
      slug: values.name,
      description: values.description,
      sortOrder: values.sortOrder,
      isActive: values.status === "active",
    },
    include: {
      menu: {
        select: { name: true },
      },
      _count: {
        select: { products: true },
      },
    },
  })

  return mapCategory(category)
}

export async function updateCategory(categoryId: string, values: CategoryFormValues) {
  try {
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        menuId: values.menuId,
        name: values.name,
        slug: values.name,
        description: values.description,
        sortOrder: values.sortOrder,
        isActive: values.status === "active",
      },
      include: {
        menu: {
          select: { name: true },
        },
        _count: {
          select: { products: true },
        },
      },
    })

    return mapCategory(category)
  } catch {
    return null
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    await prisma.category.delete({
      where: { id: categoryId },
    })
    return true
  } catch {
    return false
  }
}

export async function deleteCategoriesByMenuId(menuId: string) {
  await prisma.category.deleteMany({
    where: { menuId },
  })
}

export async function reorderCategories(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.category.update({
        where: { id },
        data: { sortOrder: index + 1 },
      }),
    ),
  )

  return (await getCatalogManagementData()).categories
}

export async function createProduct(values: ProductFormValues) {
  const product = await prisma.product.create({
    data: {
      categoryId: values.categoryId,
      name: values.name,
      slug: values.name,
      description: values.description,
      price: values.price,
      imageUrl: values.imageUrl,
      isActive: values.status === "active",
      sortOrder: values.sortOrder,
    },
    include: {
      category: {
        include: {
          menu: {
            select: { name: true },
          },
        },
      },
    },
  })

  return mapProduct(product)
}

export async function updateProduct(productId: string, values: ProductFormValues) {
  try {
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        categoryId: values.categoryId,
        name: values.name,
        slug: values.name,
        description: values.description,
        price: values.price,
        imageUrl: values.imageUrl,
        isActive: values.status === "active",
        sortOrder: values.sortOrder,
      },
      include: {
        category: {
          include: {
            menu: {
              select: { name: true },
            },
          },
        },
      },
    })

    return mapProduct(product)
  } catch {
    return null
  }
}

export async function deleteProduct(productId: string) {
  try {
    await prisma.product.delete({
      where: { id: productId },
    })
    return true
  } catch {
    return false
  }
}

export async function reorderProducts(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.product.update({
        where: { id },
        data: { sortOrder: index + 1 },
      }),
    ),
  )

  return (await getCatalogManagementData()).products
}

export async function getCategoriesByMenuId(menuId: string) {
  const categories = await prisma.category.findMany({
    where: { menuId },
    orderBy: { sortOrder: "asc" },
    include: {
      menu: {
        select: { name: true },
      },
      _count: {
        select: { products: true },
      },
    },
  })

  return categories.map(mapCategory)
}

export async function createMenuOption(_menu: MenuOption) {
  return null
}

export async function updateMenuOption(_menuId: string, _values: Partial<MenuOption>) {
  return null
}

export async function deleteMenuOption(_menuId: string) {
  return null
}

export async function isValidMenuId(menuId: string) {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    select: { id: true },
  })

  return Boolean(menu)
}

export async function isValidCategoryId(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  })

  return Boolean(category)
}

export async function isProductNameTaken(
  name: string,
  categoryId: string,
  excludedProductId?: string,
) {
  const products = await prisma.product.findMany({
    where: { categoryId },
    select: {
      id: true,
      name: true,
    },
  })

  const normalized = normalizeName(name)

  return products.some(
    (product) =>
      normalizeName(product.name) === normalized &&
      product.id !== excludedProductId,
  )
}

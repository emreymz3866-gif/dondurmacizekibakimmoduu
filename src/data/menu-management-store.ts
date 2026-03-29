import "server-only"

import { slugify } from "@/lib/slugify"
import { prisma, runPrismaWithReconnect } from "@/lib/prisma"
import type {
  MenuDetail,
  MenuFormValues,
  MenuManagementData,
  MenuManagementItem,
} from "@/types/menu-management"

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR")
}

function mapMenuRecord(menu: {
  id: string
  name: string
  description: string | null
  coverImageUrl: string
  slug: string
  isActive: boolean
  sortOrder: number
  updatedAt: Date
  branchMenus: Array<{
    branchId: string
    branch: {
      name: string
    }
  }>
  categories: Array<{
    _count: {
      products: number
    }
  }>
}): MenuManagementItem {
  const branchRelation = menu.branchMenus[0]
  const productCount = menu.categories.reduce(
    (total, category) => total + category._count.products,
    0,
  )

  return {
    id: menu.id,
    name: menu.name,
    description: menu.description ?? "",
    coverImageUrl: menu.coverImageUrl,
    slug: menu.slug,
    branchId: branchRelation?.branchId ?? "",
    branchName: branchRelation?.branch.name ?? "Sube bulunamadi",
    status: menu.isActive ? "active" : "passive",
    sortOrder: menu.sortOrder,
    categoryCount: menu.categories.length,
    productCount,
    updatedAt: menu.updatedAt.toISOString(),
  }
}

async function findMenus() {
  return runPrismaWithReconnect((client) =>
    client.menu.findMany({
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
        categories: {
          include: {
            _count: {
              select: { products: true },
            },
          },
        },
      },
    }),
  )
}

async function findMenusWithClient(client: typeof prisma) {
  return client.menu.findMany({
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
      categories: {
        include: {
          _count: {
            select: { products: true },
          },
        },
      },
    },
  })
}

export async function getMenuManagementData(): Promise<MenuManagementData> {
  const { branches, menus } = await runPrismaWithReconnect(async (client) => {
    const branches = await client.branch.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          shortAddress: true,
        },
      })

    const menus = await findMenusWithClient(client)

    return { branches, menus }
  })

  return {
    branches,
    menus: menus.map(mapMenuRecord),
  }
}

export async function getMenuDetail(menuId: string): Promise<MenuDetail | null> {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: {
      branchMenus: {
        orderBy: { sortOrder: "asc" },
        include: {
          branch: {
            select: { name: true },
          },
        },
      },
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { products: true },
          },
        },
      },
    },
  })

  if (!menu) {
    return null
  }

  return {
    ...mapMenuRecord(menu),
    categories: menu.categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      productCount: category._count.products,
      sortOrder: category.sortOrder,
    })),
  }
}

export async function createMenu(values: MenuFormValues) {
  const menu = await prisma.menu.create({
    data: {
      name: values.name,
      description: values.description,
      coverImageUrl: values.coverImageUrl,
      slug: slugify(values.slug),
      isActive: values.status === "active",
      sortOrder: values.sortOrder,
      branchMenus: {
        create: {
          branchId: values.branchId,
          isDefault: true,
          isActive: values.status === "active",
          sortOrder: values.sortOrder,
        },
      },
    },
    include: {
      branchMenus: {
        include: {
          branch: {
            select: { name: true },
          },
        },
      },
      categories: {
        include: {
          _count: {
            select: { products: true },
          },
        },
      },
    },
  })

  return mapMenuRecord(menu)
}

export async function updateMenu(menuId: string, values: MenuFormValues) {
  const existing = await prisma.menu.findUnique({
    where: { id: menuId },
    include: {
      branchMenus: true,
    },
  })

  if (!existing) {
    return null
  }

  const currentBranchRelation = existing.branchMenus[0]

  const menu = await prisma.menu.update({
    where: { id: menuId },
    data: {
      name: values.name,
      description: values.description,
      coverImageUrl: values.coverImageUrl,
      slug: slugify(values.slug),
      isActive: values.status === "active",
      sortOrder: values.sortOrder,
      branchMenus: currentBranchRelation
        ? {
            update: {
              where: { id: currentBranchRelation.id },
              data: {
                branchId: values.branchId,
                isActive: values.status === "active",
                isDefault: true,
                sortOrder: values.sortOrder,
              },
            },
          }
        : {
            create: {
              branchId: values.branchId,
              isActive: values.status === "active",
              isDefault: true,
              sortOrder: values.sortOrder,
            },
          },
    },
    include: {
      branchMenus: {
        include: {
          branch: {
            select: { name: true },
          },
        },
      },
      categories: {
        include: {
          _count: {
            select: { products: true },
          },
        },
      },
    },
  })

  return mapMenuRecord(menu)
}

export async function deleteMenu(menuId: string) {
  try {
    await prisma.menu.delete({
      where: { id: menuId },
    })
    return true
  } catch {
    return false
  }
}

export async function toggleMenuStatus(menuId: string) {
  const existing = await prisma.menu.findUnique({
    where: { id: menuId },
    include: {
      branchMenus: true,
    },
  })

  if (!existing) {
    return null
  }

  const nextActive = !existing.isActive

  const menu = await prisma.menu.update({
    where: { id: menuId },
    data: {
      isActive: nextActive,
      branchMenus: existing.branchMenus.length
        ? {
            updateMany: {
              where: {},
              data: { isActive: nextActive },
            },
          }
        : undefined,
    },
    include: {
      branchMenus: {
        include: {
          branch: {
            select: { name: true },
          },
        },
      },
      categories: {
        include: {
          _count: {
            select: { products: true },
          },
        },
      },
    },
  })

  return mapMenuRecord(menu)
}

export async function isMenuSlugTaken(slug: string, excludedMenuId?: string) {
  const menu = await prisma.menu.findFirst({
    where: {
      slug: slugify(slug),
      ...(excludedMenuId ? { id: { not: excludedMenuId } } : {}),
    },
    select: { id: true },
  })

  return Boolean(menu)
}

export async function isMenuNameTaken(name: string, excludedMenuId?: string) {
  const menus = await prisma.menu.findMany({
    select: {
      id: true,
      name: true,
    },
  })

  const normalized = normalizeName(name)

  return menus.some(
    (menu) => normalizeName(menu.name) === normalized && menu.id !== excludedMenuId,
  )
}

export async function isBranchValid(branchId: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true },
  })

  return Boolean(branch)
}

export async function getMenuById(menuId: string) {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: {
      branchMenus: {
        include: {
          branch: {
            select: { name: true },
          },
        },
      },
      categories: {
        include: {
          _count: {
            select: { products: true },
          },
        },
      },
    },
  })

  return menu ? mapMenuRecord(menu) : null
}

export async function getMenusByBranchId(branchId: string) {
  const menus = await prisma.menu.findMany({
    where: {
      branchMenus: {
        some: { branchId },
      },
    },
    include: {
      branchMenus: {
        include: {
          branch: {
            select: { name: true },
          },
        },
      },
      categories: {
        include: {
          _count: {
            select: { products: true },
          },
        },
      },
    },
  })

  return menus.map(mapMenuRecord)
}

export async function getMenuName(menuId: string) {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    select: { name: true },
  })

  return menu?.name ?? "Menu bulunamadi"
}

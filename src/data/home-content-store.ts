import "server-only"

import { prisma, runPrismaWithReconnect } from "@/lib/prisma"
import type {
  HomeBranchCardContent,
  HomeContentConfig,
} from "@/types/home-content-management"
import type { Branch } from "@/types/menu"

export interface HomePageBranchView extends Branch {
  cardTitle: string
  cardShortAddress: string
  cardMapUrl: string
}

export interface HomePageContentView {
  content: HomeContentConfig
  branches: HomePageBranchView[]
  city: string
}

async function getSiteSettingRecord() {
  return runPrismaWithReconnect((client) =>
    client.siteSetting.findFirst({
      orderBy: { updatedAt: "desc" },
    }),
  )
}

async function getBranchRecordsWithMenus() {
  return runPrismaWithReconnect((client) =>
    client.branch.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        branchMenus: {
          where: {
            isActive: true,
            menu: {
              isActive: true,
            },
          },
          orderBy: { sortOrder: "asc" },
          include: {
            menu: {
              include: {
                categories: {
                  where: { isActive: true },
                  orderBy: { sortOrder: "asc" },
                  include: {
                    products: {
                      where: { isActive: true },
                      orderBy: { sortOrder: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
        homeCard: true,
      },
    }),
  )
}

function mapMenuBranch(branch: Awaited<ReturnType<typeof getBranchRecordsWithMenus>>[number]): HomePageBranchView | null {
  const activeMenu = branch.branchMenus[0]?.menu

  if (!activeMenu) {
    return null
  }

  return {
    id: branch.id,
    slug: branch.slug,
    name: branch.name,
    shortAddress: branch.shortAddress,
    fullAddress: branch.fullAddress,
    mapUrl: branch.mapUrl,
    phone: branch.phone,
    serviceNote: branch.serviceNote,
    menu: {
      id: activeMenu.id,
      name: activeMenu.name,
      description: activeMenu.description ?? "",
      categories: activeMenu.categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description ?? "",
        products: category.products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description ?? "",
          price: Number(product.price),
          imageUrl: product.imageUrl,
          isActive: product.isActive,
        })),
      })),
    },
    cardTitle: branch.homeCard?.title ?? branch.name,
    cardShortAddress: branch.homeCard?.shortAddress ?? branch.shortAddress,
    cardMapUrl: branch.homeCard?.mapUrl ?? branch.mapUrl,
  }
}

export async function getHomeContentConfig(): Promise<HomeContentConfig> {
  const { siteSetting, branches } = await runPrismaWithReconnect(async (client) => {
    const siteSetting = await client.siteSetting.findFirst({
      orderBy: { updatedAt: "desc" },
    })

    const branches = await client.branch.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        shortAddress: true,
        mapUrl: true,
        phone: true,
        homeCard: true,
      },
    })

    return { siteSetting, branches }
  })

  return {
    siteTitle: siteSetting?.siteName ?? "Dondurmacı Zeki",
    slogan: siteSetting?.slogan ?? "",
    logoUrl: siteSetting?.logoUrl ?? "",
    backgroundImageUrl: siteSetting?.backgroundImageUrl ?? "",
    menuButtonText: siteSetting?.menuButtonText ?? "Menuyu Goruntule",
    branchCards: branches.map((branch) => ({
      branchId: branch.id,
      title: branch.homeCard?.title ?? branch.name,
      shortAddress: branch.homeCard?.shortAddress ?? branch.shortAddress,
      mapUrl: branch.homeCard?.mapUrl ?? branch.mapUrl,
    })),
    socialLinks: {
      phone: siteSetting?.phone ?? branches[0]?.phone ?? "",
      instagram: siteSetting?.instagramUrl ?? "",
      tiktok: siteSetting?.tiktokUrl ?? "",
      whatsapp: siteSetting?.whatsappUrl ?? "",
    },
  }
}

export async function getHomePageContentView(): Promise<HomePageContentView> {
  const [content, branches] = await Promise.all([
    getHomeContentConfig(),
    getBranchRecordsWithMenus(),
  ])

  return {
    content,
    city: "Sanliurfa",
    branches: branches
      .map(mapMenuBranch)
      .filter((branch): branch is HomePageBranchView => Boolean(branch)),
  }
}

export async function getHomeContentEditorConfig(): Promise<HomeContentConfig> {
  return getHomeContentConfig()
}

export async function updateHomeContentConfig(values: HomeContentConfig) {
  const existing = await getSiteSettingRecord()

  if (existing) {
    await prisma.siteSetting.update({
      where: { id: existing.id },
      data: {
        siteName: values.siteTitle,
        slogan: values.slogan,
        description: values.slogan,
        logoUrl: values.logoUrl,
        backgroundImageUrl: values.backgroundImageUrl,
        menuButtonText: values.menuButtonText,
        phone: values.socialLinks.phone,
        instagramUrl: values.socialLinks.instagram,
        tiktokUrl: values.socialLinks.tiktok,
        whatsappUrl: values.socialLinks.whatsapp,
      },
    })
  } else {
    await prisma.siteSetting.create({
      data: {
        siteName: values.siteTitle,
        slogan: values.slogan,
        description: values.slogan,
        logoUrl: values.logoUrl,
        backgroundImageUrl: values.backgroundImageUrl,
        menuButtonText: values.menuButtonText,
        phone: values.socialLinks.phone,
        instagramUrl: values.socialLinks.instagram,
        tiktokUrl: values.socialLinks.tiktok,
        whatsappUrl: values.socialLinks.whatsapp,
      },
    })
  }

  await Promise.all(values.branchCards.map((card) => upsertHomeBranchCard(card)))

  return getHomeContentConfig()
}

export async function upsertHomeBranchCard(values: HomeBranchCardContent) {
  const branch = await prisma.branch.findUnique({
    where: { id: values.branchId },
    select: { sortOrder: true },
  })

  if (!branch) {
    return null
  }

  return prisma.homeBranchCard.upsert({
    where: { branchId: values.branchId },
    update: {
      title: values.title,
      shortAddress: values.shortAddress,
      mapUrl: values.mapUrl,
      isActive: true,
    },
    create: {
      branchId: values.branchId,
      title: values.title,
      shortAddress: values.shortAddress,
      mapUrl: values.mapUrl,
      sortOrder: branch.sortOrder,
      isActive: true,
    },
  })
}

export async function removeHomeBranchCard(branchId: string) {
  await prisma.homeBranchCard.deleteMany({
    where: { branchId },
  })
}

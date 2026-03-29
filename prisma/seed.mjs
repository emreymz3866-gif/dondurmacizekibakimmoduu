import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parse } from "dotenv"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../node_modules/.prisma/client/default.js"

function readLocalDatabaseUrlFallback() {
  try {
    const envFile = readFileSync(join(process.cwd(), ".env"), "utf8")
    const parsedEnv = parse(envFile)
    return parsedEnv.DATABASE_URL
  } catch {
    return undefined
  }
}

function resolveDatabaseUrl() {
  const databaseUrl =
    process.env.DATABASE_URL?.includes("[YOUR_DB_PASSWORD]")
      ? readLocalDatabaseUrlFallback() ?? process.env.DATABASE_URL
      : process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL tanimli degil.")
  }

  if (!databaseUrl.startsWith("prisma+postgres://")) {
    return databaseUrl
  }

  const parsedUrl = new URL(databaseUrl)
  const encodedApiKey = parsedUrl.searchParams.get("api_key")

  if (!encodedApiKey) {
    throw new Error("Prisma URL icinde api_key bulunamadi.")
  }

  const payload = JSON.parse(
    Buffer.from(encodedApiKey, "base64url").toString("utf8"),
  )

  if (!payload.databaseUrl) {
    throw new Error("Prisma URL icinden dogrudan veritabani adresi cikarilamadi.")
  }

  return payload.databaseUrl
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(resolveDatabaseUrl()),
})

const adminPasswordHash =
  "scrypt:d036312dfd7bed6c1cb7513ead8ff976:c98669d86c2d7e1229ff7c66aa2aa6787c434382a6fcdeba67dba998995c684bf61283f14aa342b8961c39d260bcc54d5239e73382ded8c13f8c925b29359926"

const siteSetting = {
  siteName: "Dondurmacı Zeki",
  slogan: "Maras usulu dondurma, sakin ve premium bir sunumla.",
  description:
    "Subeni sec, konumu gor ve menüyü tek dokunusla ac. Hizli, net ve mobil odakli bir QR menu deneyimi.",
  logoUrl:
    "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=512&q=80",
  backgroundImageUrl:
    "https://images.unsplash.com/photo-1571506165871-ee72a35bc9d4?auto=format&fit=crop&w=1600&q=80",
  menuButtonText: "Menüyü Görüntüle",
  phone: "+90 414 000 00 02",
  instagramUrl: "https://instagram.com/dondurmacizeki",
  tiktokUrl: "https://tiktok.com/@dondurmacizeki",
  whatsappUrl: "https://wa.me/904140000001",
  primaryColor: "#9a3412",
  secondaryColor: "#f59e0b",
}

const branches = [
  {
    slug: "karakopru-subesi",
    name: "Karakopru Subesi",
    shortAddress: "Diyarbakir Yolu Cad. No:45, Karakopru",
    fullAddress: "Diyarbakir Yolu Cad. No:45, Karakopru / Sanliurfa",
    mapUrl: "https://maps.google.com/?q=Sanliurfa+Karakopru+Diyarbakir+Yolu+45",
    phone: "+90 414 000 00 02",
    serviceNote: "Aile boyu servisler ve ferah kup secenekleri",
    sortOrder: 1,
  },
]

const menuSeeds = [
  {
    slug: "karakopru-menusu",
    name: "Karakopru Menusu",
    description:
      "Ailece paylasilan kup servisleri, tatlilar ve ferahlatan icecekler.",
    branchSlug: "karakopru-subesi",
    sortOrder: 1,
    categories: [
      {
        slug: "dondurmalar",
        name: "Dondurmalar",
        description: "Kaymakli ve meyveli dondurma secenekleri.",
        sortOrder: 1,
        products: [
          {
            slug: "kaymakli-dondurma",
            name: "Kaymakli Dondurma",
            description: "Yumusak dokulu, kaymak aromasi belirgin premium secim.",
            price: 105,
            imageUrl:
              "https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=1200&q=80",
            sortOrder: 1,
            isActive: true,
          },
          {
            slug: "meyveli-kup-dondurma",
            name: "Meyveli Kup Dondurma",
            description: "Cilek, muz ve cikolata sosla katmanli sunum.",
            price: 145,
            imageUrl:
              "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=1200&q=80",
            sortOrder: 2,
            isActive: true,
          },
        ],
      },
      {
        slug: "kunefeler",
        name: "Kunefeler",
        description: "Ailece paylasima uygun sicak tatli secenekleri.",
        sortOrder: 2,
        products: [
          {
            slug: "ozel-kunefe-tabagi",
            name: "Ozel Kunefe Tabagi",
            description: "Bol fistikli ve dondurma eslikli premium tabak.",
            price: 150,
            imageUrl:
              "https://images.unsplash.com/photo-1617196039897-fc7dcad7d0b9?auto=format&fit=crop&w=1200&q=80",
            sortOrder: 1,
            isActive: true,
          },
          {
            slug: "cifte-peynirli-kunefe",
            name: "Cifte Peynirli Kunefe",
            description: "Daha yogun peynir dokulu sicak servis.",
            price: 160,
            imageUrl:
              "https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=1200&q=80",
            sortOrder: 2,
            isActive: true,
          },
        ],
      },
      {
        slug: "sutlu-tatlilar",
        name: "Sutlu Tatlilar",
        description: "Hafif ve premium porsiyon sutlu tatli secenekleri.",
        sortOrder: 3,
        products: [
          {
            slug: "supangle",
            name: "Supangle",
            description: "Yogun kakao dokulu, serin servis edilen sutlu tatli.",
            price: 92,
            imageUrl:
              "https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?auto=format&fit=crop&w=1200&q=80",
            sortOrder: 1,
            isActive: true,
          },
          {
            slug: "profiterol-kase",
            name: "Profiterol Kase",
            description: "Mini hamur toplari ve akiskan cikolata sos ile servis.",
            price: 98,
            imageUrl:
              "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80",
            sortOrder: 2,
            isActive: true,
          },
        ],
      },
      {
        slug: "icecekler",
        name: "Icecekler",
        description: "Serinletici ve menuyu tamamlayan icecek secenekleri.",
        sortOrder: 4,
        products: [
          {
            slug: "naneli-ayran",
            name: "Naneli Ayran",
            description: "Ferahlatici nane dokunusuyla geleneksel ayran.",
            price: 55,
            imageUrl:
              "https://images.unsplash.com/photo-1553531889-56cc480ac5cb?auto=format&fit=crop&w=1200&q=80",
            sortOrder: 1,
            isActive: true,
          },
          {
            slug: "soda-limon",
            name: "Soda Limon",
            description: "Hafif ve ferah bir eslikci secenek.",
            price: 45,
            imageUrl:
              "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80",
            sortOrder: 2,
            isActive: true,
          },
        ],
      },
    ],
  },
]

async function upsertBranches() {
  const records = []

  for (const branch of branches) {
    const record = await prisma.branch.upsert({
      where: { slug: branch.slug },
      update: branch,
      create: branch,
    })

    records.push(record)
  }

  return records
}

async function upsertMenus(branchRecordsBySlug) {
  const menuRecords = []

  for (const menuSeed of menuSeeds) {
    const { branchSlug, categories, ...menuData } = menuSeed
    const branch = branchRecordsBySlug.get(branchSlug)

    if (!branch) {
      throw new Error(`Branch not found for menu: ${menuSeed.slug}`)
    }

    const coverImageUrl = categories[0]?.products[0]?.imageUrl ?? ""

    const menu = await prisma.menu.upsert({
      where: { slug: menuSeed.slug },
      update: {
        ...menuData,
        coverImageUrl,
      },
      create: {
        ...menuData,
        coverImageUrl,
      },
    })

    await prisma.branchMenu.upsert({
      where: {
        branchId_menuId: {
          branchId: branch.id,
          menuId: menu.id,
        },
      },
      update: {
        isActive: true,
        isDefault: true,
        sortOrder: menuSeed.sortOrder,
      },
      create: {
        branchId: branch.id,
        menuId: menu.id,
        isActive: true,
        isDefault: true,
        sortOrder: menuSeed.sortOrder,
      },
    })

    await prisma.category.deleteMany({
      where: { menuId: menu.id },
    })

    for (const categorySeed of categories) {
      const { products, ...categoryData } = categorySeed

      await prisma.category.create({
        data: {
          ...categoryData,
          menuId: menu.id,
          products: {
            create: products,
          },
        },
      })
    }

    menuRecords.push({ menu, branch })
  }

  return menuRecords
}

async function main() {
  await prisma.siteSetting.deleteMany()
  await prisma.siteSetting.create({ data: siteSetting })

  await prisma.adminUser.upsert({
    where: { email: "admin@dondurmacizeki.com" },
    update: {
      name: "Zeki Admin",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      name: "Zeki Admin",
      email: "admin@dondurmacizeki.com",
      passwordHash: adminPasswordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  })

  const branchRecords = await upsertBranches()
  const branchRecordsBySlug = new Map(branchRecords.map((branch) => [branch.slug, branch]))

  for (const branch of branchRecords) {
    await prisma.homeBranchCard.upsert({
      where: { branchId: branch.id },
      update: {
        title: branch.name,
        shortAddress: branch.shortAddress,
        mapUrl: branch.mapUrl,
        sortOrder: branch.sortOrder,
        isActive: true,
      },
      create: {
        branchId: branch.id,
        title: branch.name,
        shortAddress: branch.shortAddress,
        mapUrl: branch.mapUrl,
        sortOrder: branch.sortOrder,
        isActive: true,
      },
    })
  }

  const menuRecords = await upsertMenus(branchRecordsBySlug)

  for (const item of menuRecords) {
    const generatedUrl = `https://dondurmacizeki.com/sube/${item.branch.slug}`

    await prisma.qrDesign.upsert({
      where: {
        branchId_menuId: {
          branchId: item.branch.id,
          menuId: item.menu.id,
        },
      },
      update: {
        title: `${item.branch.name} QR Menu`,
        subtitle: "Menumuz icin QR kodu okutun",
        generatedUrl,
        logoUrl: siteSetting.logoUrl,
        showLogo: true,
        showIcon: true,
        backgroundColor: "#fff7ed",
        qrBackgroundColor: "#ffffff",
        textColor: "#1c1917",
        accentColor: "#c2410c",
        frameThickness: 3,
        cornerRadius: 20,
        templateKey: "amber-premium",
        isActive: true,
      },
      create: {
        branchId: item.branch.id,
        menuId: item.menu.id,
        title: `${item.branch.name} QR Menu`,
        subtitle: "Menumuz icin QR kodu okutun",
        generatedUrl,
        logoUrl: siteSetting.logoUrl,
        showLogo: true,
        showIcon: true,
        backgroundColor: "#fff7ed",
        qrBackgroundColor: "#ffffff",
        textColor: "#1c1917",
        accentColor: "#c2410c",
        frameThickness: 3,
        cornerRadius: 20,
        templateKey: "amber-premium",
        isActive: true,
      },
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error("Seed failed:", error)
    await prisma.$disconnect()
    process.exit(1)
  })

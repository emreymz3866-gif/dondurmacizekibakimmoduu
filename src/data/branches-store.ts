import "server-only"

import { slugify } from "@/lib/slugify"
import { prisma } from "@/lib/prisma"
import type {
  BranchFormValues,
  BranchManagementData,
  BranchManagementItem,
  BranchStatus,
} from "@/types/branch-management"

function mapBranch(
  branch: {
    id: string
    name: string
    slug: string
    shortAddress: string
    fullAddress: string
    mapUrl: string
    phone: string
    serviceNote: string
    isActive: boolean
    sortOrder: number
  },
  menuCount = 0,
): BranchManagementItem {
  return {
    id: branch.id,
    name: branch.name,
    slug: branch.slug,
    shortAddress: branch.shortAddress,
    fullAddress: branch.fullAddress,
    mapUrl: branch.mapUrl,
    phone: branch.phone,
    serviceNote: branch.serviceNote,
    status: branch.isActive ? "active" : "passive",
    sortOrder: branch.sortOrder,
    menuCount,
  }
}

export async function getBranchOptions() {
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      shortAddress: true,
    },
  })

  return branches
}

export async function getBranchRecords() {
  const branches = await prisma.branch.findMany({
    orderBy: { sortOrder: "asc" },
  })

  return branches.map((branch) => mapBranch(branch))
}

export async function getBranchManagementData(
  getMenuCount: (branchId: string) => Promise<number>,
): Promise<BranchManagementData> {
  const branches = await prisma.branch.findMany({
    orderBy: { sortOrder: "asc" },
  })

  const items = await Promise.all(
    branches.map(async (branch) =>
      mapBranch(branch, await getMenuCount(branch.id)),
    ),
  )

  return { branches: items }
}

export async function getBranchById(branchId: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  })

  return branch ? mapBranch(branch) : null
}

export async function createBranch(values: BranchFormValues) {
  const branch = await prisma.branch.create({
    data: {
      name: values.name,
      slug: slugify(values.slug),
      shortAddress: values.shortAddress,
      fullAddress: values.fullAddress,
      mapUrl: values.mapUrl,
      phone: values.phone,
      serviceNote: values.serviceNote,
      isActive: values.status === "active",
      sortOrder: values.sortOrder,
    },
  })

  return mapBranch(branch)
}

export async function updateBranch(branchId: string, values: BranchFormValues) {
  try {
    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        name: values.name,
        slug: slugify(values.slug),
        shortAddress: values.shortAddress,
        fullAddress: values.fullAddress,
        mapUrl: values.mapUrl,
        phone: values.phone,
        serviceNote: values.serviceNote,
        isActive: values.status === "active",
        sortOrder: values.sortOrder,
      },
    })

    return mapBranch(branch)
  } catch {
    return null
  }
}

export async function deleteBranch(branchId: string) {
  try {
    await prisma.branch.delete({
      where: { id: branchId },
    })
    return true
  } catch {
    return false
  }
}

export async function toggleBranchStatus(branchId: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  })

  if (!branch) {
    return null
  }

  const updated = await prisma.branch.update({
    where: { id: branchId },
    data: {
      isActive: !branch.isActive,
    },
  })

  return mapBranch(updated)
}

export async function isBranchSlugTaken(
  slug: string,
  excludedBranchId?: string,
) {
  const branch = await prisma.branch.findFirst({
    where: {
      slug: slugify(slug),
      ...(excludedBranchId ? { id: { not: excludedBranchId } } : {}),
    },
    select: { id: true },
  })

  return Boolean(branch)
}

export async function hasBranch(branchId: string, status?: BranchStatus) {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      ...(status ? { isActive: status === "active" } : {}),
    },
    select: { id: true },
  })

  return Boolean(branch)
}

export async function getBranchNameById(branchId: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { name: true },
  })

  return branch?.name ?? "Sube bulunamadi"
}

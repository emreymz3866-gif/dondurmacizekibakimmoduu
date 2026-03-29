import "server-only"

import type {
  QrDesignFormValues,
  QrDesignItem,
  QrDesignManagementData,
} from "@/types/qr-design-management"
import { prisma } from "@/lib/prisma"

function mapQrDesign(
  design: {
    id: string
    branchId: string
    menuId: string
    generatedUrl: string
    title: string
    subtitle: string | null
    showLogo: boolean
    showIcon: boolean
    backgroundColor: string
    qrBackgroundColor: string
    textColor: string
    accentColor: string
    frameThickness: number
    cornerRadius: number
    templateKey: string
    logoUrl: string | null
    isActive: boolean
    updatedAt: Date
  },
  resolveBranchName: (branchId: string) => Promise<string>,
  resolveMenuName: (menuId: string) => Promise<string>,
): Promise<QrDesignItem> {
  return Promise.all([
    resolveBranchName(design.branchId),
    resolveMenuName(design.menuId),
  ]).then(([branchName, menuName]) => ({
    id: design.id,
    branchId: design.branchId,
    branchName,
    menuId: design.menuId,
    menuName,
    generatedUrl: design.generatedUrl,
    title: design.title,
    subtitle: design.subtitle ?? "",
    showLogo: design.showLogo,
    showIcon: design.showIcon,
    backgroundColor: design.backgroundColor,
    qrBackgroundColor: design.qrBackgroundColor,
    textColor: design.textColor,
    accentColor: design.accentColor,
    frameThickness: design.frameThickness,
    cornerRadius: design.cornerRadius,
    templateId: design.templateKey,
    logoUrl: design.logoUrl ?? "",
    isActive: design.isActive,
    updatedAt: design.updatedAt.toISOString(),
  }))
}

export async function getQrDesignManagementData(
  resolveBranchName: (branchId: string) => Promise<string>,
  resolveMenuName: (menuId: string) => Promise<string>,
): Promise<QrDesignManagementData> {
  const designs = await prisma.qrDesign.findMany({
    orderBy: { updatedAt: "desc" },
  })

  return {
    designs: await Promise.all(
      designs.map((design) => mapQrDesign(design, resolveBranchName, resolveMenuName)),
    ),
  }
}

export async function getQrDesignById(
  designId: string,
  resolveBranchName: (branchId: string) => Promise<string>,
  resolveMenuName: (menuId: string) => Promise<string>,
) {
  const design = await prisma.qrDesign.findUnique({
    where: { id: designId },
  })

  if (!design) {
    return null
  }

  return mapQrDesign(design, resolveBranchName, resolveMenuName)
}

export async function createQrDesign(values: QrDesignFormValues) {
  return prisma.qrDesign.create({
    data: {
      branchId: values.branchId,
      menuId: values.menuId,
      generatedUrl: values.generatedUrl,
      title: values.title,
      subtitle: values.subtitle,
      showLogo: values.showLogo,
      showIcon: values.showIcon,
      backgroundColor: values.backgroundColor,
      qrBackgroundColor: values.qrBackgroundColor,
      textColor: values.textColor,
      accentColor: values.accentColor,
      frameThickness: values.frameThickness,
      cornerRadius: values.cornerRadius,
      templateKey: values.templateId,
      logoUrl: values.logoUrl,
      isActive: values.isActive,
    },
  })
}

export async function updateQrDesign(designId: string, values: QrDesignFormValues) {
  try {
    return await prisma.qrDesign.update({
      where: { id: designId },
      data: {
        branchId: values.branchId,
        menuId: values.menuId,
        generatedUrl: values.generatedUrl,
        title: values.title,
        subtitle: values.subtitle,
        showLogo: values.showLogo,
        showIcon: values.showIcon,
        backgroundColor: values.backgroundColor,
        qrBackgroundColor: values.qrBackgroundColor,
        textColor: values.textColor,
        accentColor: values.accentColor,
        frameThickness: values.frameThickness,
        cornerRadius: values.cornerRadius,
        templateKey: values.templateId,
        logoUrl: values.logoUrl,
        isActive: values.isActive,
      },
    })
  } catch {
    return null
  }
}

export async function deleteQrDesign(designId: string) {
  try {
    await prisma.qrDesign.delete({
      where: { id: designId },
    })
    return true
  } catch {
    return false
  }
}

export async function deleteQrDesignsByMenuId(menuId: string) {
  await prisma.qrDesign.deleteMany({
    where: { menuId },
  })
}

export async function deleteQrDesignsByBranchId(branchId: string) {
  await prisma.qrDesign.deleteMany({
    where: { branchId },
  })
}

export async function hasQrDesignConflict(
  branchId: string,
  menuId: string,
  excludedDesignId?: string,
) {
  const design = await prisma.qrDesign.findFirst({
    where: {
      branchId,
      menuId,
      ...(excludedDesignId ? { id: { not: excludedDesignId } } : {}),
    },
    select: { id: true },
  })

  return Boolean(design)
}

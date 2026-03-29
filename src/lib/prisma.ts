import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../node_modules/.prisma/client/default.js"
import { parse } from "dotenv"

type PrismaConnectionPayload = {
  databaseUrl?: string
}

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
  const envDatabaseUrl = process.env.DATABASE_URL ?? readLocalDatabaseUrlFallback()
  const databaseUrl =
    envDatabaseUrl?.includes("[YOUR_DB_PASSWORD]")
      ? readLocalDatabaseUrlFallback() ?? envDatabaseUrl
      : envDatabaseUrl

  if (!databaseUrl) {
    throw new Error("DATABASE_URL tanimli degil.")
  }

  if (databaseUrl.includes("[YOUR_DB_PASSWORD]")) {
    throw new Error(
      "DATABASE_URL icinde Supabase parola placeholder'i var. Gercek veritabani parolasini eklemelisiniz.",
    )
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
  ) as PrismaConnectionPayload

  if (!payload.databaseUrl) {
    throw new Error("Prisma URL icinden dogrudan veritabani adresi cikarilamadi.")
  }

  return payload.databaseUrl
}

const connectionUrl = resolveDatabaseUrl()

declare global {
  var __prismaClient: PrismaClient | undefined
  var __prismaClientUrl: string | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg(connectionUrl),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

function isRecoverableConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message.includes("Server has closed the connection.") ||
    error.message.includes("Can't reach database server") ||
    error.message.includes("connection") ||
    error.message.includes("ECONNRESET")
  )
}

function getOrCreatePrismaClient() {
  if (globalThis.__prismaClient && globalThis.__prismaClientUrl === connectionUrl) {
    return globalThis.__prismaClient
  }

  const client = createPrismaClient()
  globalThis.__prismaClient = client
  globalThis.__prismaClientUrl = connectionUrl
  return client
}

export let prisma = getOrCreatePrismaClient()

export async function runPrismaWithReconnect<T>(
  operation: (client: PrismaClient) => Promise<T>,
) {
  try {
    await prisma.$connect()
    return await operation(prisma)
  } catch (error) {
    if (!isRecoverableConnectionError(error)) {
      throw error
    }

    const retryClient = createPrismaClient()

    try {
      await retryClient.$connect()
      const result = await operation(retryClient)

      globalThis.__prismaClient = retryClient
      globalThis.__prismaClientUrl = connectionUrl
      prisma = retryClient

      return result
    } catch (retryError) {
      await retryClient.$disconnect().catch(() => undefined)
      throw retryError
    }
  }
}

import { PrismaClient } from "@prisma/client"
import "@/lib/env" // Validate environment variables on first import

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // On serverless (Amplify), each Lambda invocation gets its own Prisma instance.
  // Limit the connection pool to prevent exhausting the database max_connections.
  // RDS free tier default is 80-100 connections; we keep pool small per instance.
  const isProduction = process.env.NODE_ENV === "production"

  return new PrismaClient({
    datasourceUrl: isProduction
      ? appendConnectionParams(process.env.DATABASE_URL || "")
      : process.env.DATABASE_URL,
    log: isProduction ? ["error"] : ["error", "warn"],
  })
}

/**
 * Appends connection pool parameters to the DATABASE_URL for serverless.
 * - connection_limit: Max connections per Prisma instance (keep low for serverless)
 * - pool_timeout: How long to wait for a connection before erroring (seconds)
 * - connect_timeout: TCP connection timeout (seconds)
 */
function appendConnectionParams(url: string): string {
  if (!url) return url

  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}connection_limit=5&pool_timeout=10&connect_timeout=10&socket_timeout=10`
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

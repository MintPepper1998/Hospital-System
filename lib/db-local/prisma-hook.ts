import { localStore } from "./store"

const WRITE_OPERATIONS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
])

/**
 * Attaches real-time database-to-local persistence to a Prisma Client instance.
 * Automatically saves new/updated/deleted records to the local store on every write.
 */
export function attachLocalSyncExtension<T extends object>(prismaClient: T): T {
  // If already attached, return as is
  if ((prismaClient as any).__hasLocalSync) {
    return prismaClient
  }

  const extended = (prismaClient as any).$extends({
    name: "local-db-sync-extension",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          const result = await query(args)

          // If this is a write operation, record locally in background without blocking
          if (WRITE_OPERATIONS.has(operation)) {
            setImmediate(() => {
              try {
                localStore.recordChange(model, operation, result, args)
              } catch (err) {
                console.warn(`[LocalSyncExtension] Failed to record change for ${model}:`, err)
              }
            })
          }

          return result
        },
      },
    },
  })

  ;(extended as any).__hasLocalSync = true
  return extended as T
}


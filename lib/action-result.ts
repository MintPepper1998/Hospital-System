export interface ActionResult<T = void> {
  success: boolean
  message: string
  data?: T
}

export function actionSuccess<T = void>(message: string, data?: T): ActionResult<T> {
  return { success: true, message, data }
}

export function actionError(message: string): ActionResult {
  return { success: false, message }
}

/**
 * Extracts a user-friendly message from an unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "An unexpected error occurred"
}

/**
 * Checks if a Prisma error is a unique constraint violation.
 */
export function isPrismaUniqueError(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002"
}

/**
 * Checks if a Prisma error is a foreign key constraint violation.
 */
export function isPrismaForeignKeyError(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2003"
}

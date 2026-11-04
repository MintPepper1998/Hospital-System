"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { revalidatePath } from "next/cache"
import { writeAuditLog } from "@/lib/audit"

export async function updateDoctorOpdLetterhead(staffId: string, url: string | null) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ACCOUNTANT"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    await prisma.staff.update({
      where: { id: staffId },
      data: { opdCustomPaperUrl: url },
    })

    revalidatePath("/dashboard/settings/print")
    
    writeAuditLog({ 
      userId: authResult.session.userId, 
      action: "UPDATE", 
      module: "Settings", 
      recordId: staffId, 
      changes: { opdCustomPaperUrl: url ? "UPDATED" : "REMOVED" } 
    })

    return { success: true, message: url ? "Letterhead updated successfully" : "Letterhead removed" }
  } catch (error) {
    console.error("[updateDoctorOpdLetterhead] Error:", error)
    return { success: false, message: "Failed to update doctor letterhead" }
  }
}

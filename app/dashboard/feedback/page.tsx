import { requireAuthSafe } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { FeedbackClient } from "./feedback-client"
import { getStaffFeedback } from "@/lib/actions/feedback"

import { auth } from "@/auth"

export const dynamic = "force-dynamic"

export default async function FeedbackAdminPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }
  
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || (!user.permissions.includes("FEEDBACK") && user.role !== "SUPER_ADMIN" && user.role !== "RECEPTIONIST")) {
    redirect("/dashboard")
  }

  const feedbacks = await getStaffFeedback()

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Patient Feedback</h1>
        <p className="text-muted-foreground mt-2">Manage patient suggestions and complaints.</p>
      </div>

      <FeedbackClient initialFeedbacks={feedbacks} />
    </div>
  )
}

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, User, Clock, Shield, Gamepad2 } from "lucide-react"
import { format } from "date-fns"
import { SnakeGame } from "@/components/pharmacy/snake-game"
import { PharmacyIdentityForm } from "@/components/pharmacy/pharmacy-identity-form"

export default async function PharmacySettingsPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/login")
  }

  const [user, hospitalSettings] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email },
    }),
    prisma.hospitalSettings.findUnique({
      where: { id: 1 },
    }),
  ])

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Settings
        </h2>
        <p className="text-muted-foreground mt-2">
          Your account settings and pharmacy identity
        </p>
      </div>

      {/* Pharmacy Identity — Editable */}
      <PharmacyIdentityForm
        initial={{
          pharmacyName: hospitalSettings?.pharmacyName || "Shree Kamal Pharmacy",
          pharmacyGstNo: hospitalSettings?.pharmacyGstNo || "",
          pharmacyDrugLicense: hospitalSettings?.pharmacyDrugLicense || "",
          pharmacyAddress: hospitalSettings?.pharmacyAddress || "",
          pharmacyPhone: hospitalSettings?.pharmacyPhone || "",
        }}
      />

      {/* Account Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-blue-600" />
              Account Details
            </CardTitle>
            <CardDescription>Your login and identity information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Role</span>
              <span className="text-sm font-medium capitalize bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {user.role.toLowerCase().replace("_", " ")}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-purple-600" />
              Security & Session
            </CardTitle>
            <CardDescription>Session and login activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Account Created</span>
              <span className="text-sm font-medium">
                {format(new Date(user.createdAt), "dd MMM yyyy")}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-muted-foreground">Last Updated</span>
              <span className="text-sm font-medium">
                {format(new Date(user.updatedAt), "dd MMM yyyy, hh:mm a")}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Current Session</span>
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Active
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fun Zone - Snake Game */}
      <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-green-600" />
          Break Time 🎮
        </h3>
        <SnakeGame />
      </div>
    </div>
  )
}

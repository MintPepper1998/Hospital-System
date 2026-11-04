import { getMyProfile } from "@/app/actions/user-profile"
import { redirect } from "next/navigation"
import { ProfileClient } from "@/components/profile/profile-client"

export default async function ProfilePage() {
  const result = await getMyProfile()

  if (!result.success || !result.data) {
    redirect("/login")
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          My Profile
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account details and security settings
        </p>
      </div>

      <ProfileClient profile={result.data} />
    </div>
  )
}

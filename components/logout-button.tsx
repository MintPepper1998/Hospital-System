"use client"

import { logout } from "@/lib/actions"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"
import { useTransition } from "react"
import { Loader2 } from "lucide-react"

export function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      await logout()
    })
  }

  return (
    <DropdownMenuItem
      className="text-red-600 cursor-pointer"
      onClick={handleLogout}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="mr-2 h-4 w-4" />
      )}
      {isPending ? "Signing out..." : "Sign Out"}
    </DropdownMenuItem>
  )
}

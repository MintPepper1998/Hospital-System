"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Eye,
  Filter,
} from "lucide-react"
import { toggleUserStatus, deleteUser } from "@/lib/actions/user-management"
import { toast } from "sonner"

// ============================================
// Types
// ============================================

interface UserRow {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string
  isActive: boolean
  createdAt: string
  staff: {
    department: string | null
    designation: string | null
    specialization: string | null
    employeeId: string | null
    consultationFee: number | null
  } | null
}

interface Props {
  users: UserRow[]
  currentRoleFilter: string
  currentSearch: string
}

// ============================================
// Role Badge Component
// ============================================

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  DOCTOR: "bg-blue-100 text-blue-700",
  NURSE: "bg-pink-100 text-pink-700",
  ADMIN: "bg-gray-100 text-gray-700",
  PATIENT: "bg-green-100 text-green-700",
  RECEPTIONIST: "bg-amber-100 text-amber-700",
  PHARMACIST: "bg-teal-100 text-teal-700",
  LAB_TECHNICIAN: "bg-cyan-100 text-cyan-700",
  ACCOUNTANT: "bg-orange-100 text-orange-700",
  BILLING_CLERK: "bg-sky-100 text-sky-700",
}

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_STYLES[role] || "bg-gray-100 text-gray-700"
  return (
    <Badge className={`${style} border-0 text-[10px] font-semibold`}>
      {role.replace(/_/g, " ")}
    </Badge>
  )
}

const ALL_ROLES = [
  { value: "ALL", label: "All Roles" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "LAB_TECHNICIAN", label: "Lab Technician" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "BILLING_CLERK", label: "Billing Counter Clerk" },
  { value: "PATIENT", label: "Patient" },
]

// ============================================
// Main Table Component
// ============================================

export function UserTableClient({ users, currentRoleFilter, currentSearch }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState(currentSearch)
  const [roleFilter, setRoleFilter] = useState(currentRoleFilter)
  const [isPending, startTransition] = useTransition()

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [isActioning, setIsActioning] = useState(false)

  // Push filters to URL
  function applyFilters(newSearch?: string, newRole?: string) {
    const s = newSearch ?? search
    const r = newRole ?? roleFilter
    const params = new URLSearchParams()
    if (r && r !== "ALL") params.set("role", r)
    if (s) params.set("q", s)
    startTransition(() => {
      router.push(`/dashboard/admin/users?${params.toString()}`)
    })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    applyFilters()
  }

  function handleRoleChange(role: string) {
    setRoleFilter(role)
    applyFilters(search, role)
  }

  // Actions
  async function handleToggleStatus() {
    if (!selectedUser) return
    setIsActioning(true)
    try {
      const result = await toggleUserStatus(selectedUser.id)
      toast.success(
        result.isActive
          ? `${selectedUser.name} has been activated`
          : `${selectedUser.name} has been deactivated`
      )
    } catch (e: any) {
      toast.error(e.message || "Failed to update user status")
    } finally {
      setIsActioning(false)
      setToggleDialogOpen(false)
      setSelectedUser(null)
    }
  }

  async function handleDelete() {
    if (!selectedUser) return
    setIsActioning(true)
    try {
      await deleteUser(selectedUser.id)
      toast.success(`${selectedUser.name} has been deleted`)
    } catch (e: any) {
      toast.error(e.message || "Failed to delete user")
    } finally {
      setIsActioning(false)
      setDeleteDialogOpen(false)
      setSelectedUser(null)
    }
  }

  return (
    <>
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-0">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 border-b border-gray-100 bg-gray-50/50">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-white border-gray-200"
              />
            </form>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
              <div className="flex flex-wrap gap-1.5">
                {ALL_ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handleRoleChange(r.value)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors ${
                      roleFilter === r.value
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-500 border border-gray-200 hover:border-indigo-200 hover:text-indigo-600"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white hover:bg-white">
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 w-[250px]">User</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Role</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Department</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Joined</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 text-center">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-sm text-gray-400">
                      No users found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-indigo-50/30 transition-colors">
                      {/* User (Avatar + Name + Email) */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-[10px] font-bold text-white">
                              {(user.name || "?")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.name || "—"}</p>
                            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <RoleBadge role={user.role} />
                        {user.staff?.employeeId && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{user.staff.employeeId}</p>
                        )}
                      </TableCell>

                      {/* Department */}
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {user.staff?.department || "—"}
                        </span>
                        {user.staff?.designation && (
                          <p className="text-[10px] text-gray-400">{user.staff.designation}</p>
                        )}
                      </TableCell>

                      {/* Joined */}
                      <TableCell>
                        <span className="text-sm text-gray-600 tabular-nums">
                          {format(new Date(user.createdAt), "MMM d, yyyy")}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            user.isActive
                              ? "text-green-600 border-green-200 bg-green-50"
                              : "text-red-500 border-red-200 bg-red-50"
                          }
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreHorizontal className="h-4 w-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/admin/users/${user.id}`} className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/admin/users/${user.id}/edit`} className="flex items-center gap-2">
                                <Pencil className="h-3.5 w-3.5" />
                                Edit User
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/admin/users/${user.id}/edit?tab=security`} className="flex items-center gap-2">
                                <KeyRound className="h-3.5 w-3.5" />
                                Reset Password
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user)
                                setToggleDialogOpen(true)
                              }}
                              className="flex items-center gap-2"
                            >
                              {user.isActive ? (
                                <>
                                  <ShieldOff className="h-3.5 w-3.5 text-amber-500" />
                                  <span className="text-amber-600">Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
                                  <span className="text-green-600">Activate</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            {user.role !== "SUPER_ADMIN" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user)
                                  setDeleteDialogOpen(true)
                                }}
                                className="flex items-center gap-2 text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-400">
            Showing {users.length} user{users.length !== 1 ? "s" : ""}
          </div>
        </CardContent>
      </Card>

      {/* Toggle Status Dialog */}
      <AlertDialog open={toggleDialogOpen} onOpenChange={setToggleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.isActive ? "Deactivate" : "Activate"} User?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.isActive
                ? `This will prevent ${selectedUser?.name} from logging in. They can be reactivated later.`
                : `This will allow ${selectedUser?.name} to log in again.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              disabled={isActioning}
              className={
                selectedUser?.isActive
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {isActioning
                ? "Processing..."
                : selectedUser?.isActive
                ? "Deactivate"
                : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{selectedUser?.name}</strong> ({selectedUser?.email}).
              This action cannot be undone. All associated data (staff records, sessions) will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isActioning}
              className="bg-red-600 hover:bg-red-700"
            >
              {isActioning ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

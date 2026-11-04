"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, Save, KeyRound, User as UserIcon, Briefcase, Shield } from "lucide-react"
import { updateUser, resetUserPassword } from "@/lib/actions/user-management"
import { toast } from "sonner"
import { AVAILABLE_MODULES, ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions"
import { Checkbox } from "@/components/ui/checkbox"

// ============================================
// Types
// ============================================

interface UserData {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: string
  permissions: string[]
  isActive: boolean
  staff: {
    department: string | null
    designation: string | null
    specialization: string | null
    licenseNumber: string | null
    phone: string | null
    address: string | null
    emergencyContact: string | null
    consultationFee: number | null
    basicSalary: number | null
    employeeId: string | null
  } | null
}

const STAFF_ROLES = ["DOCTOR", "NURSE", "PHARMACIST", "LAB_TECHNICIAN", "RECEPTIONIST", "ACCOUNTANT", "BILLING_CLERK"]

// ============================================
// Edit Form Component
// ============================================

export function EditUserForm({ user }: { user: UserData }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "profile"

  const [selectedRole, setSelectedRole] = useState(user.role)
  const [permissions, setPermissions] = useState<string[]>(user.permissions || [])
  const [isActive, setIsActive] = useState(user.isActive)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function handleRoleChange(newRole: string) {
    setSelectedRole(newRole)
    // Update permissions to default for the new role
    if (ROLE_DEFAULT_PERMISSIONS[newRole]) {
      setPermissions([...ROLE_DEFAULT_PERMISSIONS[newRole]])
    } else {
      setPermissions([])
    }
  }

  function handlePermissionChange(moduleId: string, checked: boolean) {
    setPermissions(prev => {
      let next = new Set(prev)
      
      if (checked) {
        next.add(moduleId)
        // If this is a parent module, also select all sub-modules
        const mod = AVAILABLE_MODULES.find(m => m.id === moduleId)
        if (mod) {
          mod.subModules.forEach(sub => next.add(sub.id))
        } else {
          const parent = AVAILABLE_MODULES.find(m => m.subModules.some(s => s.id === moduleId))
          if (parent) next.add(parent.id)
        }
      } else {
        next.delete(moduleId)
        // If this is a parent module, also deselect all sub-modules
        const mod = AVAILABLE_MODULES.find(m => m.id === moduleId)
        if (mod) {
          mod.subModules.forEach(sub => next.delete(sub.id))
        }
      }
      return Array.from(next)
    })
  }

  // Password reset
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)

  const isStaffRole = STAFF_ROLES.includes(selectedRole)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError("")

    // Inject isActive and permissions into formData
    formData.set("isActive", String(isActive))
    formData.set("permissions", JSON.stringify(permissions))

    try {
      await updateUser(user.id, formData)
      toast.success("User updated successfully")
    } catch (e: any) {
      setError(e.message || "Failed to update user")
      setLoading(false)
    }
  }

  async function handlePasswordReset() {
    if (!newPassword) {
      toast.error("Please enter a new password")
      return
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setPasswordLoading(true)
    try {
      await resetUserPassword(user.id, newPassword)
      toast.success("Password has been reset successfully")
      setNewPassword("")
      setConfirmPassword("")
    } catch (e: any) {
      toast.error(e.message || "Failed to reset password")
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/admin/users"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <Badge variant="outline" className="text-xs">
          ID: {user.id.slice(0, 8)}...
        </Badge>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Editing: <strong>{user.name}</strong> ({user.email})
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="profile" className="gap-1.5 text-xs">
            <UserIcon className="h-3.5 w-3.5" />
            Profile
          </TabsTrigger>
          {isStaffRole && (
            <TabsTrigger value="staff" className="gap-1.5 text-xs">
              <Briefcase className="h-3.5 w-3.5" />
              Staff Details
            </TabsTrigger>
          )}
          <TabsTrigger value="security" className="gap-1.5 text-xs">
            <Shield className="h-3.5 w-3.5" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* ── PROFILE TAB ── */}
        <form action={handleSubmit}>
          <TabsContent value="profile" forceMount className="space-y-4 data-[state=inactive]:hidden">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
                <CardDescription>Update the user&apos;s personal details and role.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={user.name || ""}
                    placeholder="Full name"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={user.phone || ""}
                    placeholder="+91 98765 43210"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    name="role"
                    value={selectedRole}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="DOCTOR">Doctor</SelectItem>
                      <SelectItem value="NURSE">Nurse</SelectItem>
                      <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                      <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                      <SelectItem value="LAB_TECHNICIAN">Lab Technician</SelectItem>
                      <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                      <SelectItem value="BILLING_CLERK">Billing Counter Clerk</SelectItem>
                      <SelectItem value="PATIENT">Patient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div>
                    <Label htmlFor="active-toggle" className="font-medium">
                      Account Status
                    </Label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isActive
                        ? "User can log in and access the system"
                        : "User is blocked from logging in"}
                    </p>
                  </div>
                  <Switch
                    id="active-toggle"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>

                {/* Permissions section */}
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <Label className="text-base">Access Permissions</Label>
                    <p className="text-xs text-gray-500 mt-1">Select the modules this user can access. Defaults are set by role.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                    {AVAILABLE_MODULES.map((module) => (
                      <div key={module.id} className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <Checkbox 
                            id={`perm-${module.id}`} 
                            checked={permissions.includes(module.id)}
                            onCheckedChange={(checked) => handlePermissionChange(module.id, checked === true)}
                            className="mt-0.5"
                          />
                          <label 
                            htmlFor={`perm-${module.id}`} 
                            className="text-sm font-semibold text-gray-900 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {module.label}
                          </label>
                        </div>
                        
                        {/* Sub-modules */}
                        {module.subModules?.length > 0 && (
                          <div className="ml-6 space-y-2">
                            {module.subModules.map((sub) => (
                              <div key={sub.id} className="flex items-start space-x-2">
                                <Checkbox 
                                  id={`perm-${sub.id}`} 
                                  checked={permissions.includes(sub.id)}
                                  onCheckedChange={(checked) => handlePermissionChange(sub.id, checked === true)}
                                  className="mt-0.5"
                                />
                                <label 
                                  htmlFor={`perm-${sub.id}`} 
                                  className="text-sm text-gray-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {sub.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── STAFF DETAILS TAB ── */}
          {isStaffRole && (
            <TabsContent value="staff" forceMount className="space-y-4 data-[state=inactive]:hidden">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Staff / Professional Details</CardTitle>
                  <CardDescription>
                    Department, specialization, and compensation details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Department */}
                    <div className="space-y-1.5">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        name="department"
                        defaultValue={user.staff?.department || ""}
                        placeholder="e.g., Cardiology"
                      />
                    </div>

                    {/* Designation */}
                    <div className="space-y-1.5">
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        name="designation"
                        defaultValue={user.staff?.designation || ""}
                        placeholder="e.g., Senior Doctor"
                      />
                    </div>

                    {/* Specialization (Doctor only) */}
                    {selectedRole === "DOCTOR" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="specialization">Specialization</Label>
                        <Input
                          id="specialization"
                          name="specialization"
                          defaultValue={user.staff?.specialization || ""}
                          placeholder="e.g., Cardiologist"
                        />
                      </div>
                    )}

                    {/* License Number */}
                    <div className="space-y-1.5">
                      <Label htmlFor="licenseNumber">License / Registration No.</Label>
                      <Input
                        id="licenseNumber"
                        name="licenseNumber"
                        defaultValue={user.staff?.licenseNumber || ""}
                        placeholder="e.g., MCI-12345"
                      />
                    </div>

                    {/* Consultation Fee (Doctor only) */}
                    {selectedRole === "DOCTOR" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="consultationFee">Consultation Fee (₹)</Label>
                        <Input
                          id="consultationFee"
                          name="consultationFee"
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={user.staff?.consultationFee || 500}
                        />
                      </div>
                    )}

                    {/* Basic Salary */}
                    <div className="space-y-1.5">
                      <Label htmlFor="basicSalary">Basic Salary (₹/month)</Label>
                      <Input
                        id="basicSalary"
                        name="basicSalary"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={user.staff?.basicSalary || ""}
                        placeholder="Monthly salary"
                      />
                    </div>
                  </div>

                  {/* Staff Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="staffPhone">Work Phone</Label>
                      <Input
                        id="staffPhone"
                        name="staffPhone"
                        defaultValue={user.staff?.phone || ""}
                        placeholder="Work phone number"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emergencyContact">Emergency Contact</Label>
                      <Input
                        id="emergencyContact"
                        name="emergencyContact"
                        defaultValue={user.staff?.emergencyContact || ""}
                        placeholder="Emergency contact"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      defaultValue={user.staff?.address || ""}
                      placeholder="Full address"
                    />
                  </div>

                  {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save All Changes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </form>

        {/* ── SECURITY TAB ── */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-500" />
                Reset Password
              </CardTitle>
              <CardDescription>
                Set a new password for this user. They will need to use it on next login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat the password"
                />
              </div>

              <Button
                onClick={handlePasswordReset}
                disabled={passwordLoading}
                variant="outline"
                className="w-full gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Reset Password
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

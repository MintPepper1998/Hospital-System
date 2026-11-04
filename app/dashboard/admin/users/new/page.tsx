"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { createUser } from "@/lib/actions" // Import the server action
import { useState } from "react"
import { toast } from "sonner" // Optional: For nice alerts if you have it, otherwise we use alert()
import { Checkbox } from "@/components/ui/checkbox"
import { AVAILABLE_MODULES, ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions"

export default function AddUserPage() {
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [permissions, setPermissions] = useState<string[]>([])

  function handleRoleChange(newRole: string) {
    setSelectedRole(newRole)
    if (ROLE_DEFAULT_PERMISSIONS[newRole]) {
      setPermissions([...ROLE_DEFAULT_PERMISSIONS[newRole]])
    } else {
      setPermissions([])
    }
  }

  function handlePermissionChange(moduleId: string, checked: boolean) {
    if (checked) {
      setPermissions(prev => [...prev, moduleId])
    } else {
      setPermissions(prev => prev.filter(p => p !== moduleId))
    }
  }

  async function clientAction(formData: FormData) {
    setLoading(true)
    setError("")

    try {
      formData.set("permissions", JSON.stringify(permissions))
      // Call the Server Action we just created
      await createUser(formData)
    } catch (e: any) {
      // If the email exists or something fails, show the error
      setError(e.message || "Failed to create user")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Create New User</h1>
        <Link href="/dashboard/admin/users">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            Create a new account for a staff member or patient.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* We use 'action' instead of 'onSubmit' for Server Actions */}
          <form action={clientAction} className="space-y-6">
            
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" placeholder="Dr. John Doe" required />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="doctor@stulink.com" required />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role" required onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCTOR">Doctor</SelectItem>
                  <SelectItem value="NURSE">Nurse</SelectItem>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                  <SelectItem value="PHARMACIST">Pharmacist</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  <SelectItem value="BILLING_CLERK">Billing Counter Clerk</SelectItem>
                  <SelectItem value="LAB_TECHNICIAN">Lab Technician</SelectItem>
                  <SelectItem value="PATIENT">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Fields for Staff (Doctor, Nurse, etc.) */}
            {(selectedRole === "DOCTOR" || selectedRole === "NURSE" || selectedRole === "PHARMACIST" || selectedRole === "LAB_TECHNICIAN") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="+91 98765 43210" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" name="department" placeholder="e.g., Cardiology, Orthopedics" required />
                </div>

                {selectedRole === "DOCTOR" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization</Label>
                      <Input 
                        id="specialization" 
                        name="specialization" 
                        placeholder="e.g., Cardiologist, Orthopedic Surgeon" 
                        required 
                      />
                    </div>

                    {/* Consultation Fee - DOCTOR ONLY */}
                    <div className="space-y-2">
                      <Label htmlFor="consultationFee">
                        Consultation Fee (₹) <span className="text-xs text-muted-foreground ml-2">(Admin Only)</span>
                      </Label>
                      <Input 
                        id="consultationFee" 
                        name="consultationFee" 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="500.00" 
                        defaultValue="500"
                        required 
                      />
                      <p className="text-xs text-muted-foreground">
                        This fee will be charged for OPD consultations and cannot be changed by reception staff.
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input id="designation" name="designation" placeholder="e.g., Senior Doctor, Staff Nurse" required />
                </div>
              </>
            )}

            {/* Permissions section */}
            <div className="space-y-3 pt-4 border-t">
              <div>
                <Label className="text-base">Access Permissions</Label>
                <p className="text-xs text-gray-500 mt-1">Select the modules this user can access. Defaults are set by role.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_MODULES.map((module) => (
                  <div key={module.id} className="flex items-start space-x-2">
                    <Checkbox 
                      id={`perm-${module.id}`} 
                      checked={permissions.includes(module.id)}
                      onCheckedChange={(checked) => handlePermissionChange(module.id, checked === true)}
                    />
                    <label 
                      htmlFor={`perm-${module.id}`} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {module.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

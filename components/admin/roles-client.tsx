"use client"

import { useState } from "react"
import { RoleTemplate } from "@prisma/client"
import { createRoleTemplate, updateRoleTemplate, deleteRoleTemplate } from "@/app/actions/roles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Shield, Plus, Edit, Trash2 } from "lucide-react"
import { AVAILABLE_MODULES } from "@/lib/permissions"

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "LAB_TECHNICIAN", label: "Lab Technician" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "BILLING_CLERK", label: "Billing Counter Clerk" },
  { value: "CANTEEN_STAFF", label: "Canteen Staff" },
  { value: "AMBULANCE_DRIVER", label: "Ambulance Driver" },
]

export function RolesClient({ initialRoles }: { initialRoles: RoleTemplate[] }) {
  const [roles, setRoles] = useState(initialRoles)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleTemplate | null>(null)
  
  const [form, setForm] = useState({
    name: "",
    baseRole: "",
    permissions: [] as string[],
  })

  const resetForm = () => {
    setForm({ name: "", baseRole: "", permissions: [] })
    setEditingRole(null)
  }

  const handleOpenDialog = (role?: RoleTemplate) => {
    if (role) {
      setEditingRole(role)
      setForm({
        name: role.name,
        baseRole: role.baseRole,
        permissions: role.permissions,
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const togglePermission = (id: string, isParent: boolean) => {
    setForm(prev => {
      let nextPerms = new Set(prev.permissions)
      
      if (nextPerms.has(id)) {
        nextPerms.delete(id)
        if (isParent) {
          // uncheck all children
          const mod = AVAILABLE_MODULES.find(m => m.id === id)
          mod?.subModules.forEach(s => nextPerms.delete(s.id))
        }
      } else {
        nextPerms.add(id)
        if (isParent) {
          // check all children
          const mod = AVAILABLE_MODULES.find(m => m.id === id)
          mod?.subModules.forEach(s => nextPerms.add(s.id))
        } else {
          // also ensure parent is checked if a child is checked
          const parent = AVAILABLE_MODULES.find(m => m.subModules.some(s => s.id === id))
          if (parent) nextPerms.add(parent.id)
        }
      }
      return { ...prev, permissions: Array.from(nextPerms) }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.baseRole) {
      toast.error("Name and Base Role are required")
      return
    }

    try {
      if (editingRole) {
        const res = await updateRoleTemplate(editingRole.id, {
          name: form.name,
          baseRole: form.baseRole as any,
          permissions: form.permissions,
        })
        if (res.success && res.data) {
          setRoles(prev => prev.map(r => r.id === editingRole.id ? res.data! : r))
          toast.success("Role updated")
          setIsDialogOpen(false)
        } else {
          toast.error(res.message)
        }
      } else {
        const res = await createRoleTemplate({
          name: form.name,
          baseRole: form.baseRole as any,
          permissions: form.permissions,
        })
        if (res.success && res.data) {
          setRoles([res.data, ...roles])
          toast.success("Role created")
          setIsDialogOpen(false)
        } else {
          toast.error(res.message)
        }
      }
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this role template?")) return
    const res = await deleteRoleTemplate(id)
    if (res.success) {
      setRoles(prev => prev.filter(r => r.id !== id))
      toast.success("Role deleted")
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Custom Role
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map(role => (
          <Card key={role.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    {role.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">Base: {role.baseRole}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(role)}>
                    <Edit className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(role.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <div className="text-sm border-t pt-3">
                <span className="font-medium">Permissions:</span> {role.permissions.length} modules
              </div>
            </CardContent>
          </Card>
        ))}
        
        {roles.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            No custom roles found. Create one to get started.
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Custom Role" : "Create Custom Role"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role Name <span className="text-red-500">*</span></Label>
                <Input 
                  placeholder="e.g., Senior Nurse" 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Base System Role <span className="text-red-500">*</span></Label>
                <Select value={form.baseRole} onValueChange={v => setForm({...form, baseRole: v})}>
                  <SelectTrigger><SelectValue placeholder="Select base role" /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">This determines underlying systemic access.</p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border">
                {AVAILABLE_MODULES.map((module) => (
                  <div key={module.id} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`perm-${module.id}`}
                        checked={form.permissions.includes(module.id)}
                        onCheckedChange={() => togglePermission(module.id, true)}
                      />
                      <label htmlFor={`perm-${module.id}`} className="text-sm font-semibold cursor-pointer">
                        {module.label}
                      </label>
                    </div>
                    {module.subModules.length > 0 && (
                      <div className="pl-6 space-y-2">
                        {module.subModules.map((sub) => (
                          <div key={sub.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`perm-${sub.id}`}
                              checked={form.permissions.includes(sub.id)}
                              onCheckedChange={() => togglePermission(sub.id, false)}
                            />
                            <label htmlFor={`perm-${sub.id}`} className="text-sm text-gray-600 cursor-pointer">
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save Custom Role</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

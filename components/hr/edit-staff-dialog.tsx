"use client"

import { useState, useTransition, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Loader2, ShieldCheck, CheckSquare, Search } from "lucide-react"
import { toast } from "sonner"
import { updateStaff } from "@/app/actions/staff"
import { getPresignedUrl } from "@/app/actions/upload"
import { AVAILABLE_MODULES, ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions"
import { Checkbox } from "@/components/ui/checkbox"

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "LAB_TECHNICIAN", label: "Lab Technician" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "BILLING_CLERK", label: "Billing Clerk" },
  { value: "CANTEEN_STAFF", label: "Canteen Staff" },
  { value: "AMBULANCE_DRIVER", label: "Ambulance Driver" },
]

export function EditStaffDialog({
  open,
  onOpenChange,
  staff,
  departments,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: any
  departments: string[]
  onSuccess: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  
  const [removeProfilePhoto, setRemoveProfilePhoto] = useState(false)
  const [removeIdCard, setRemoveIdCard] = useState(false)
  
  const [form, setForm] = useState({
    id: "",
    name: "",
    phone: "",
    role: "",
    department: "",
    designation: "",
    specialization: "",
    consultationFee: "",
    basicSalary: "",
    licenseNumber: "",
    permissions: [] as string[],
    password: "",
  })

  useEffect(() => {
    if (staff && open) {
      setForm({
        id: staff.id,
        name: staff.user?.name || "",
        phone: staff.phone || "",
        role: staff.user?.role || "",
        department: staff.department || "",
        designation: staff.designation || "",
        specialization: staff.specialization || "",
        consultationFee: staff.consultationFee?.toString() || "",
        basicSalary: staff.basicSalary?.toString() || "",
        licenseNumber: staff.licenseNumber || "",
        permissions: staff.user?.permissions || [],
        password: "", // intentionally empty
      })
      setProfilePhoto(null)
      setIdCardFile(null)
      setRemoveProfilePhoto(false)
      setRemoveIdCard(false)
    }
  }, [staff, open])

  const [permSearch, setPermSearch] = useState("")

  const isDoctor = form.role === "DOCTOR"

  const togglePermission = (id: string, isParent: boolean) => {
    setForm((prev) => {
      let nextPerms = new Set(prev.permissions)
      if (nextPerms.has(id)) {
        nextPerms.delete(id)
        if (isParent) {
          const mod = AVAILABLE_MODULES.find(m => m.id === id)
          mod?.subModules.forEach(s => nextPerms.delete(s.id))
        }
      } else {
        nextPerms.add(id)
        if (isParent) {
          const mod = AVAILABLE_MODULES.find(m => m.id === id)
          mod?.subModules.forEach(s => nextPerms.add(s.id))
        } else {
          const parent = AVAILABLE_MODULES.find(m => m.subModules.some(s => s.id === id))
          if (parent) nextPerms.add(parent.id)
        }
      }
      return { ...prev, permissions: Array.from(nextPerms) }
    })
  }

  const handleSelectAll = () => {
    const all = new Set<string>()
    AVAILABLE_MODULES.forEach(m => {
      all.add(m.id)
      m.subModules.forEach(s => all.add(s.id))
    })
    setForm(prev => ({ ...prev, permissions: Array.from(all) }))
  }

  const handleDeselectAll = () => {
    setForm(prev => ({ ...prev, permissions: [] }))
  }

  const handleApplyRoleDefaults = () => {
    if (form.role && ROLE_DEFAULT_PERMISSIONS[form.role]) {
      setForm(prev => ({ ...prev, permissions: [...ROLE_DEFAULT_PERMISSIONS[form.role]] }))
      toast.info(`Applied default permissions for ${form.role}`)
    }
  }

  const filteredModules = AVAILABLE_MODULES.filter(m => {
    if (!permSearch.trim()) return true
    const q = permSearch.toLowerCase()
    if (m.label.toLowerCase().includes(q)) return true
    return m.subModules.some(s => s.label.toLowerCase().includes(q))
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.role || !form.department) {
      toast.error("Please fill all required fields")
      return
    }

    setIsUploading(true)

    try {
      let profileUrl: string | undefined = undefined
      if (profilePhoto) {
        const pre = await getPresignedUrl(profilePhoto.name, profilePhoto.type, "profile-photos")
        await fetch(pre.url, { method: "PUT", body: profilePhoto, headers: { "Content-Type": profilePhoto.type } })
        profileUrl = pre.publicUrl
      } else if (removeProfilePhoto) {
        profileUrl = ""
      }

      let idCardUrl: string | undefined = undefined
      if (idCardFile) {
        const pre = await getPresignedUrl(idCardFile.name, idCardFile.type, "id-cards")
        await fetch(pre.url, { method: "PUT", body: idCardFile, headers: { "Content-Type": idCardFile.type } })
        idCardUrl = pre.publicUrl
      } else if (removeIdCard) {
        idCardUrl = ""
      }

      startTransition(async () => {
        const result = await updateStaff({
          id: form.id,
          name: form.name,
          phone: form.phone || undefined,
          role: form.role,
          department: form.department,
          designation: form.designation || undefined,
          specialization: isDoctor ? (form.specialization || undefined) : undefined,
          consultationFee: isDoctor && form.consultationFee ? parseFloat(form.consultationFee) : undefined,
          basicSalary: form.basicSalary ? parseFloat(form.basicSalary) : undefined,
          licenseNumber: form.licenseNumber || undefined,
          permissions: form.permissions.length > 0 ? form.permissions : undefined,
          password: form.password || undefined,
          image: profileUrl,
          idCardImage: idCardUrl,
        })

        if (result.success) {
          toast.success(result.message)
          onOpenChange(false)
          onSuccess()
        } else {
          toast.error(result.message)
        }
      })
    } catch (err: any) {
      toast.error("File upload failed: " + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            Edit Staff Profile
          </DialogTitle>
          <DialogDescription>
            Update details and permissions for {staff?.user?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Row 1: Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-xs">Phone Number</Label>
              <Input
                id="edit-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Row 2: Role & Department */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Role <span className="text-red-500">*</span></Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department <span className="text-red-500">*</span></Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Dept" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Extra Details based on role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-designation" className="text-xs">Designation</Label>
              <Input
                id="edit-designation"
                placeholder="e.g. Senior Nurse"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-basicSalary" className="text-xs">Basic Salary (₹)</Label>
              <Input
                id="edit-basicSalary"
                type="number"
                placeholder="0.00"
                value={form.basicSalary}
                onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
              />
            </div>
          </div>

          {isDoctor && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-specialization" className="text-xs">Specialization</Label>
                <Input
                  id="edit-specialization"
                  value={form.specialization}
                  onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-consultationFee" className="text-xs">Consultation Fee (₹)</Label>
                <Input
                  id="edit-consultationFee"
                  type="number"
                  value={form.consultationFee}
                  onChange={(e) => setForm({ ...form, consultationFee: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-licenseNumber" className="text-xs">License No.</Label>
                <Input
                  id="edit-licenseNumber"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Permissions Matrix */}
          <div className="space-y-3 mt-4 pt-4 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Permissions</Label>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {form.permissions.length} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                  onClick={handleApplyRoleDefaults}
                >
                  Apply Role Defaults
                </Button>
                <span className="text-gray-300">|</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
                <span className="text-gray-300">|</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  onClick={handleDeselectAll}
                >
                  Clear All
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search modules or permissions (e.g. OT, Day Close, Vouchers, WhatsApp)..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                className="pl-8 text-xs h-8 bg-gray-50/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-muted/20 p-3 rounded-lg border max-h-[340px] overflow-y-auto">
              {filteredModules.map((module) => {
                const subModulesToShow = permSearch.trim()
                  ? module.subModules.filter(s => s.label.toLowerCase().includes(permSearch.toLowerCase()) || module.label.toLowerCase().includes(permSearch.toLowerCase()))
                  : module.subModules

                const isParentChecked = form.permissions.includes(module.id)

                return (
                  <div key={module.id} className="p-3 rounded-md border bg-card/70 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-perm-${module.id}`}
                          checked={isParentChecked}
                          onCheckedChange={() => togglePermission(module.id, true)}
                        />
                        <label htmlFor={`edit-perm-${module.id}`} className="text-xs font-bold cursor-pointer text-gray-900 flex items-center gap-1.5">
                          {module.label}
                        </label>
                      </div>
                      {module.subModules.length > 0 && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                          {module.subModules.filter(s => form.permissions.includes(s.id)).length}/{module.subModules.length}
                        </span>
                      )}
                    </div>
                    {subModulesToShow.length > 0 && (
                      <div className="pl-5 space-y-1.5 border-l-2 border-blue-100 ml-1.5 my-1">
                        {subModulesToShow.map((sub) => (
                          <div key={sub.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-perm-${sub.id}`}
                              checked={form.permissions.includes(sub.id)}
                              onCheckedChange={() => togglePermission(sub.id, false)}
                              className="h-3.5 w-3.5"
                            />
                            <label htmlFor={`edit-perm-${sub.id}`} className="text-xs text-gray-600 cursor-pointer hover:text-gray-900 leading-tight">
                              {sub.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredModules.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-gray-400">
                  No matching permissions found for &quot;{permSearch}&quot;
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5 pt-4 border-t mt-4">
            <Label htmlFor="edit-password" className="text-xs text-amber-600 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Change Password (Leave empty to keep current)
            </Label>
            <Input
              id="edit-password"
              type="text"
              placeholder="Enter new password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Profile Photo</Label>
              {staff?.user?.image && !removeProfilePhoto && !profilePhoto ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                  <span className="truncate flex-1 text-xs">Current photo attached</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-600" onClick={() => setRemoveProfilePhoto(true)}>Remove</Button>
                </div>
              ) : (
                <Input type="file" accept="image/*" onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)} />
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">ID Card (Image/PDF)</Label>
              {staff?.idCardImage && !removeIdCard && !idCardFile ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                  <span className="truncate flex-1 text-xs">Current document attached</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-600" onClick={() => setRemoveIdCard(true)}>Remove</Button>
                </div>
              ) : (
                <Input type="file" accept="image/*,application/pdf" onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} />
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending || isUploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isUploading} className="bg-indigo-600 hover:bg-indigo-700">
              {(isPending || isUploading) ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><CheckSquare className="mr-2 h-4 w-4" /> Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

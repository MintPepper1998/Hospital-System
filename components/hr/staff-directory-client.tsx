"use client"

import { useState, useTransition, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  UserPlus,
  Stethoscope,
  Pill,
  FlaskConical,
  ShieldCheck,
  HeartPulse,
  Phone,
  Mail,
  Building2,
  Calendar,
  Clock,
  MoreHorizontal,
  User,
  UserCheck,
  UserX,
  Loader2,
  Search,
  Eye,
  EyeOff,
  IndianRupee,
  ShieldAlert,
  Pencil,
  Trash2,
  Plus,
  Settings2,
  FileSignature,
} from "lucide-react"
import { createStaff, toggleStaffStatus, updateStaff, deleteStaff, addHRDepartment, renameHRDepartment, deleteHRDepartment } from "@/app/actions/staff"
import { uploadSignature } from "@/app/actions/signature"
import { toggleEmployeeLeave } from "@/lib/actions/hr"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { AVAILABLE_MODULES, ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions"
import { getPresignedUrl } from "@/app/actions/upload"
import { Checkbox } from "@/components/ui/checkbox"
import { EditStaffDialog } from "./edit-staff-dialog"

// ============================================
// TYPES
// ============================================

interface StaffMember {
  id: string
  employeeId: string
  department: string | null
  designation: string | null
  specialization: string | null
  licenseNumber: string | null
  phone: string | null
  consultationFee: number
  basicSalary: number | null
  isOnLeave: boolean
  leaveReason: string | null
  joiningDate: string
  idCardImage: string | null
  signatureUrl?: string | null
  user: {
    id: string
    name: string | null
    email: string
    role: string
    isActive: boolean
    image: string | null
    signatureUrl?: string | null
  }
}

interface StaffDirectoryClientProps {
  staff: StaffMember[]
  roleTemplates?: any[]
  temporaryPermissions?: any[]
  initialDepartments?: string[]
}

// ============================================
// CONSTANTS
// ============================================

const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  DOCTOR: { label: "Doctor", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200", icon: Stethoscope },
  NURSE: { label: "Nurse", color: "text-pink-700", bgColor: "bg-pink-50 border-pink-200", icon: HeartPulse },
  PHARMACIST: { label: "Pharmacist", color: "text-green-700", bgColor: "bg-green-50 border-green-200", icon: Pill },
  LAB_TECHNICIAN: { label: "Lab Tech", color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200", icon: FlaskConical },
  RECEPTIONIST: { label: "Reception", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", icon: Users },
  ACCOUNTANT: { label: "Accountant", color: "text-teal-700", bgColor: "bg-teal-50 border-teal-200", icon: IndianRupee },
  SUPER_ADMIN: { label: "Admin", color: "text-red-700", bgColor: "bg-red-50 border-red-200", icon: ShieldCheck },
}

const DEFAULT_DEPARTMENTS = [
  "General Medicine", "Surgery", "Orthopaedics", "Paediatrics", "Gynaecology",
  "ENT", "Ophthalmology", "Dermatology", "Cardiology", "Neurology",
  "Nursing", "Pharmacy", "Laboratory", "Radiology", "Emergency",
  "ICU", "OPD", "Administration", "Housekeeping", "Accounts",
]

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

const TAB_ROLES = [
  { value: "all", label: "All Staff" },
  { value: "ADMIN", label: "Admins" },
  { value: "DOCTOR", label: "Doctors" },
  { value: "NURSE", label: "Nurses" },
  { value: "PHARMACIST", label: "Pharmacists" },
  { value: "LAB_TECHNICIAN", label: "Lab Techs" },
  { value: "RECEPTIONIST", label: "Reception" },
  { value: "ACCOUNTANT", label: "Accounts" },
]

// ============================================
// MAIN COMPONENT
// ============================================

export function StaffDirectoryClient({ staff, roleTemplates = [], temporaryPermissions = [], initialDepartments = [] }: StaffDirectoryClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [departments, setDepartments] = useState<string[]>(initialDepartments.length > 0 ? initialDepartments : DEFAULT_DEPARTMENTS)
  const [showDeptDialog, setShowDeptDialog] = useState(false)

  useEffect(() => {
    if (initialDepartments.length > 0) {
      setDepartments(initialDepartments)
    }
  }, [initialDepartments])

  // Filter staff by search
  const filteredStaff = (role: string) => {
    let list = role === "all" ? staff : staff.filter((s) => s.user.role === role)
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(
        (s) =>
          s.user.name?.toLowerCase().includes(q) ||
          s.user.email.toLowerCase().includes(q) ||
          s.employeeId.toLowerCase().includes(q) ||
          s.phone?.includes(q) ||
          s.department?.toLowerCase().includes(q)
      )
    }
    return list
  }

  return (
    <div className="space-y-4">
      {/* Search + Add Button Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, ID, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowDeptDialog(true)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Departments
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Staff
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {TAB_ROLES.map((tab) => {
            const count = tab.value === "all"
              ? staff.length
              : staff.filter((s) => s.user.role === tab.value).length
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-full px-4 py-1.5 text-sm border"
              >
                {tab.label}
                <Badge variant="secondary" className="ml-1.5 text-[10px] h-5 min-w-[20px] rounded-full">
                  {count}
                </Badge>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {TAB_ROLES.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <StaffGrid staff={filteredStaff(tab.value)} router={router} temporaryPermissions={temporaryPermissions} departments={departments} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Add Staff Dialog */}
      <AddStaffDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        roleTemplates={roleTemplates}
        onSuccess={() => {
          setShowAddDialog(false)
          router.refresh()
        }}
        departments={departments}
      />

      {/* Manage Departments Dialog */}
      <ManageDepartmentsDialog
        open={showDeptDialog}
        onOpenChange={setShowDeptDialog}
        departments={departments}
        onSave={(updated) => {
          setDepartments(updated)
        }}
      />
    </div>
  )
}

// ============================================
// STAFF GRID
// ============================================

function StaffGrid({ staff, router, temporaryPermissions = [], departments = [] }: { staff: StaffMember[]; router: ReturnType<typeof useRouter>; temporaryPermissions?: any[]; departments?: string[] }) {
  if (staff.length === 0) {
    return (
      <div className="text-center py-16">
        <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
        <h3 className="mt-4 text-lg font-semibold">No Staff Found</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Try adjusting your search or add a new staff member.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {staff.map((emp) => (
        <StaffCard key={emp.id} employee={emp} router={router} temporaryPermissions={temporaryPermissions} departments={departments} />
      ))}
    </div>
  )
}

import { TemporaryAccessDialog } from "./temporary-access-dialog"

// ============================================
// STAFF CARD
// ============================================

function StaffCard({ employee: emp, router, temporaryPermissions = [], departments = [] }: { employee: StaffMember; router: ReturnType<typeof useRouter>; temporaryPermissions?: any[]; departments?: string[] }) {
  const [isPending, startTransition] = useTransition()
  const [showTempAccess, setShowTempAccess] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const roleConf = ROLE_CONFIG[emp.user.role] || ROLE_CONFIG.SUPER_ADMIN
  const RoleIcon = roleConf.icon

  const initials = (emp.user.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const sigUrl = emp.signatureUrl || emp.user?.signatureUrl

  const handleToggleStatus = () => {
    startTransition(async () => {
      const result = await toggleStaffStatus(emp.id)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleToggleLeave = (onLeave: boolean) => {
    startTransition(async () => {
      const result = await toggleEmployeeLeave(emp.id, onLeave, onLeave ? "Marked from directory" : undefined)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Card className={`hover:shadow-md transition-shadow border ${!emp.user.isActive ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        {/* Top Row: Avatar + Actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {emp.user.image ? (
              <img 
                src={`/api/documents/view?fileUrl=${encodeURIComponent(emp.user.image)}`} 
                alt={emp.user.name || "Avatar"} 
                className="h-11 w-11 rounded-full object-cover border shadow-sm"
              />
            ) : (
              <div className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold ${roleConf.bgColor} ${roleConf.color} border`}>
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{emp.user.name || "Unknown"}</p>
              <p className="text-[10px] text-muted-foreground">{emp.employeeId}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {emp.user.isActive ? (
                <DropdownMenuItem onClick={handleToggleStatus} className="text-red-600">
                  <UserX className="mr-2 h-4 w-4" />
                  Disable Account
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleToggleStatus} className="text-green-600">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Enable Account
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {emp.isOnLeave ? (
                <DropdownMenuItem onClick={() => handleToggleLeave(false)}>
                  <UserCheck className="mr-2 h-4 w-4 text-green-600" />
                  Mark Active
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => handleToggleLeave(true)}>
                  <Clock className="mr-2 h-4 w-4 text-amber-600" />
                  Mark On Leave
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <User className="mr-2 h-4 w-4 text-indigo-600" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowTempAccess(true)}>
                <ShieldAlert className="mr-2 h-4 w-4 text-amber-600" />
                Temporary Access
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setShowDeleteDialog(true); setDeleteConfirmText("") }}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Employee
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Temporary Access Dialog */}
        {showTempAccess && (
          <TemporaryAccessDialog
            open={showTempAccess}
            onOpenChange={setShowTempAccess}
            userId={emp.user.id}
            userName={emp.user.name || "Unknown"}
            permissions={temporaryPermissions}
            onSuccess={() => {
              router.refresh()
            }}
          />
        )}

        {/* Edit Staff Dialog */}
        {showEditDialog && (
          <EditStaffDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            staff={emp}
            departments={departments}
            onSuccess={() => {
              setShowEditDialog(false)
              router.refresh()
            }}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={(open) => { setShowDeleteDialog(open); if (!open) setDeleteConfirmText("") }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Delete Employee
              </DialogTitle>
              <DialogDescription>
                You are about to permanently delete <strong>{emp.user.name}</strong> ({emp.employeeId}). 
                This will remove their account, login access, payroll records, and all associated data. 
                <span className="text-red-600 font-semibold">This action cannot be undone.</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  To confirm, type <span className="font-mono font-bold bg-red-100 px-1.5 py-0.5 rounded">DELETE</span> below:
                </p>
              </div>
              <Input
                placeholder="Type DELETE to confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className={deleteConfirmText === "DELETE" ? "border-red-500 ring-1 ring-red-500" : ""}
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText("") }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                onClick={async () => {
                  setIsDeleting(true)
                  const result = await deleteStaff(emp.id)
                  setIsDeleting(false)
                  if (result.success) {
                    toast.success(result.message)
                    setShowDeleteDialog(false)
                    router.refresh()
                  } else {
                    toast.error(result.message)
                  }
                }}
              >
                {isDeleting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
                ) : (
                  <><Trash2 className="mr-2 h-4 w-4" />Delete Permanently</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Role Badge */}
        <div className="flex items-center gap-2 mb-3">
          <Badge className={`${roleConf.bgColor} ${roleConf.color} border text-[10px] font-semibold`}>
            <RoleIcon className="h-3 w-3 mr-1" />
            {roleConf.label}
          </Badge>
          {/* Status */}
          {!emp.user.isActive ? (
            <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-[10px]">Disabled</Badge>
          ) : emp.isOnLeave ? (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">On Leave</Badge>
          ) : (
            <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">Active</Badge>
          )}
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {emp.department && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{emp.department}</span>
              {emp.designation && <span className="text-[10px]">• {emp.designation}</span>}
            </div>
          )}
          {emp.specialization && (
            <div className="flex items-center gap-1.5">
              <Stethoscope className="h-3 w-3 flex-shrink-0 text-blue-500" />
              <span>{emp.specialization}</span>
            </div>
          )}
          {emp.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span>{emp.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{emp.user.email}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>Joined {format(new Date(emp.joiningDate), "dd MMM yyyy")}</span>
          </div>
          {emp.user.role === "DOCTOR" && emp.consultationFee > 0 && (
            <div className="flex items-center gap-1.5">
              <IndianRupee className="h-3 w-3 flex-shrink-0 text-green-600" />
              <span>Consultation: ₹{emp.consultationFee}</span>
            </div>
          )}
          {sigUrl && (
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200/80 w-fit">
              <FileSignature className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-medium">Digital Signature On File</span>
            </div>
          )}
        </div>
        
        {/* Show Documents Button */}
        {(emp.user.image || emp.idCardImage || sigUrl) && (
          <div className="mt-4 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 flex items-center justify-center gap-2"
              onClick={() => {
                const overlay = document.createElement('div')
                overlay.id = 'sk-doc-overlay'
                overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.9);display:flex;flex-direction:column;backdrop-filter:blur(4px);'
                
                const toolbar = document.createElement('div')
                toolbar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 24px;background:#0f172a;border-bottom:1px solid rgba(255,255,255,0.1);'
                
                const titleSpan = document.createElement('span')
                titleSpan.textContent = `Documents: ${emp.user.name}`
                titleSpan.style.cssText = 'color:#e2e8f0;font-weight:600;font-size:14px;'
                toolbar.appendChild(titleSpan)
                
                const btnGroup = document.createElement('div')
                btnGroup.style.cssText = 'display:flex;gap:8px;'

                const closeBtn = document.createElement('button')
                closeBtn.textContent = '✕ Close'
                closeBtn.style.cssText = 'background:#334155;color:#e2e8f0;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;'
                closeBtn.onclick = () => document.body.removeChild(overlay)
                btnGroup.appendChild(closeBtn)
                
                toolbar.appendChild(btnGroup)
                
                const contentArea = document.createElement('div')
                contentArea.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:1rem;padding:2rem;overflow-y:auto;align-items:center;'
                
                const addDoc = (url: string, label: string) => {
                  const secureUrl = url.startsWith('data:') || url.startsWith('/api/') || url.startsWith('/') 
                    ? url 
                    : `/api/documents/view?fileUrl=${encodeURIComponent(url)}`

                  const wrapper = document.createElement('div')
                  wrapper.style.cssText = 'background:white;padding:1rem;border-radius:8px;width:100%;max-width:800px;display:flex;flex-direction:column;gap:0.5rem;'
                  
                  const header = document.createElement('div')
                  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;padding-bottom:0.5rem;'
                  
                  const title = document.createElement('h4')
                  title.textContent = label
                  title.style.cssText = 'margin:0;color:#334155;font-size:14px;font-weight:600;'
                  
                  const actionBtn = document.createElement('button')
                  actionBtn.textContent = '🖨️ Print'
                  actionBtn.style.cssText = 'background:#f8fafc;color:#0f172a;border:1px solid #cbd5e1;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;'
                  
                  header.appendChild(title)
                  header.appendChild(actionBtn)
                  wrapper.appendChild(header)
                  
                  if (url.toLowerCase().includes('.pdf')) {
                    const iframe = document.createElement('iframe')
                    iframe.src = secureUrl
                    iframe.style.cssText = 'width:100%;height:600px;border:none;margin-top:0.5rem;'
                    wrapper.appendChild(iframe)
                    
                    actionBtn.onclick = () => {
                      iframe.contentWindow?.print()
                    }
                  } else {
                    const img = document.createElement('img')
                    img.src = secureUrl
                    img.style.cssText = 'max-width:100%;height:auto;object-fit:contain;border:1px solid #e2e8f0;margin-top:0.5rem;'
                    wrapper.appendChild(img)
                    
                    actionBtn.onclick = () => {
                      const printIframe = document.createElement('iframe')
                      printIframe.style.cssText = 'position:absolute;width:0;height:0;border:none;'
                      document.body.appendChild(printIframe)
                      
                      const doc = printIframe.contentWindow?.document
                      if (doc) {
                        doc.open()
                        doc.write(`
                          <html>
                            <head><title>Print ${label}</title></head>
                            <body style="margin:0;display:flex;justify-content:center;align-items:center;">
                              <img src="${secureUrl}" style="max-width:100%;max-height:100vh;" onload="window.print();">
                            </body>
                          </html>
                        `)
                        doc.close()
                      }
                      
                      // Cleanup iframe after some time (print dialog blocks in some browsers, but just in case)
                      setTimeout(() => {
                        if (document.body.contains(printIframe)) {
                          document.body.removeChild(printIframe)
                        }
                      }, 10000)
                    }
                  }
                  contentArea.appendChild(wrapper)
                }

                if (emp.idCardImage) addDoc(emp.idCardImage, 'ID Card / Document')
                if (emp.user.image) addDoc(emp.user.image, 'Profile Photo')
                if (sigUrl) addDoc(sigUrl, 'Digital Signature (Standardized PNG)')

                overlay.appendChild(toolbar)
                overlay.appendChild(contentArea)
                document.body.appendChild(overlay)
              }}
            >
              <Eye className="h-3.5 w-3.5" />
              View Documents
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// ADD STAFF DIALOG
// ============================================

function AddStaffDialog({
  open,
  onOpenChange,
  roleTemplates = [],
  onSuccess,
  departments,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  roleTemplates?: any[]
  onSuccess: () => void
  departments: string[]
}) {
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "",
    customRoleId: "none",
    department: "",
    designation: "",
    specialization: "",
    consultationFee: "",
    basicSalary: "",
    licenseNumber: "",
    permissions: [] as string[],
  })

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [idCardFile, setIdCardFile] = useState<File | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)

  const isDoctor = form.role === "DOCTOR"
  const [permSearch, setPermSearch] = useState("")

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

  const resetForm = () => {
    setForm({
      name: "", email: "", password: "", phone: "", role: "", customRoleId: "none",
      department: "", designation: "", specialization: "",
      consultationFee: "", basicSalary: "", licenseNumber: "", permissions: []
    })
    setShowPassword(false)
    setProfilePhoto(null)
    setIdCardFile(null)
    setSignatureFile(null)
    setPermSearch("")
  }

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

  const handleCustomRoleSelect = (val: string) => {
    if (val === "none") {
      setForm(f => ({ ...f, customRoleId: val, role: "", permissions: [] }))
      return
    }
    const template = roleTemplates.find(r => r.id === val)
    if (template) {
      setForm(f => ({
        ...f,
        customRoleId: val,
        role: template.baseRole,
        permissions: template.permissions
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name || !form.email || !form.password || !form.role || !form.department) {
      toast.error("Please fill all required fields")
      return
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setIsUploading(true)

    try {
      let profileUrl = ""
      if (profilePhoto) {
        const pre = await getPresignedUrl(profilePhoto.name, profilePhoto.type, "profile-photos")
        await fetch(pre.url, { method: "PUT", body: profilePhoto, headers: { "Content-Type": profilePhoto.type } })
        profileUrl = pre.publicUrl
      }
      let idCardUrl = ""
      if (idCardFile) {
        const pre = await getPresignedUrl(idCardFile.name, idCardFile.type, "id-cards")
        await fetch(pre.url, { method: "PUT", body: idCardFile, headers: { "Content-Type": idCardFile.type } })
        idCardUrl = pre.publicUrl
      }

      startTransition(async () => {
        const result = await createStaff({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          role: form.role,
          department: form.department,
          designation: form.designation || undefined,
          specialization: isDoctor ? (form.specialization || undefined) : undefined,
          consultationFee: isDoctor && form.consultationFee ? parseFloat(form.consultationFee) : undefined,
          basicSalary: form.basicSalary ? parseFloat(form.basicSalary) : undefined,
          licenseNumber: form.licenseNumber || undefined,
          permissions: form.permissions.length > 0 ? form.permissions : undefined,
          image: profileUrl || undefined,
          idCardImage: idCardUrl || undefined,
        })

        if (result.success) {
          if (signatureFile && result.data?.id) {
            const sigData = new FormData()
            sigData.append("file", signatureFile)
            sigData.append("staffId", result.data.id)
            if (result.data.userId) {
              sigData.append("userId", result.data.userId)
            }
            const sigRes = await uploadSignature(sigData)
            if (!sigRes.success) {
              toast.error("Signature processing: " + sigRes.message)
            }
          }
          toast.success(result.message)
          resetForm()
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
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm() }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Add New Staff
          </DialogTitle>
          <DialogDescription>
            Create a user account with login credentials
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Row 1: Name + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-name" className="text-xs">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="staff-name"
                placeholder="Dr. Ramesh Kumar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-email" className="text-xs">Email <span className="text-red-500">*</span></Label>
              <Input
                id="staff-email"
                type="email"
                placeholder="ramesh@hospital.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Row 2: Password + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-password" className="text-xs">Password <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="staff-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-phone" className="text-xs">Phone Number</Label>
              <Input
                id="staff-phone"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Custom Role */}
          {roleTemplates.length > 0 && (
            <div className="space-y-1.5 p-3 border rounded-lg bg-gray-50/50">
              <Label className="text-xs font-semibold">Assign Custom Role (Template)</Label>
              <Select value={form.customRoleId} onValueChange={handleCustomRoleSelect}>
                <SelectTrigger><SelectValue placeholder="Select Custom Role (Optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Custom Role</SelectItem>
                  {roleTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name} (Base: {t.baseRole})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Row 3: Role + Department */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Base Role <span className="text-red-500">*</span></Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, customRoleId: "none", permissions: ROLE_DEFAULT_PERMISSIONS[v] || [] })}>
                <SelectTrigger><SelectValue placeholder="Select base role" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Designation + Salary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-designation" className="text-xs">Designation</Label>
              <Input
                id="staff-designation"
                placeholder="e.g., Senior Consultant"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-salary" className="text-xs">Basic Salary (₹/month)</Label>
              <Input
                id="staff-salary"
                type="number"
                placeholder="25000"
                value={form.basicSalary}
                onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
              />
            </div>
          </div>

          {/* Dynamic Doctor Fields */}
          {isDoctor && (
            <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" />
                Doctor-Specific Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="staff-spec" className="text-xs">Specialization</Label>
                  <Input
                    id="staff-spec"
                    placeholder="e.g., Cardiology, Orthopaedics"
                    value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="staff-fee" className="text-xs">Consultation Fee (₹)</Label>
                  <Input
                    id="staff-fee"
                    type="number"
                    placeholder="500"
                    value={form.consultationFee}
                    onChange={(e) => setForm({ ...form, consultationFee: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-license" className="text-xs">Medical License / Registration No.</Label>
                <Input
                  id="staff-license"
                  placeholder="e.g., MCI-123456"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Permissions Matrix */}
          {form.role && (
            <div className="space-y-3 mt-4 pt-4 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fine-Grained Permissions</Label>
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
                            id={`perm-${module.id}`}
                            checked={isParentChecked}
                            onCheckedChange={() => togglePermission(module.id, true)}
                          />
                          <label htmlFor={`perm-${module.id}`} className="text-xs font-bold cursor-pointer text-gray-900 flex items-center gap-1.5">
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
                                id={`perm-${sub.id}`}
                                checked={form.permissions.includes(sub.id)}
                                onCheckedChange={() => togglePermission(sub.id, false)}
                                className="h-3.5 w-3.5"
                              />
                              <label htmlFor={`perm-${sub.id}`} className="text-xs text-gray-600 cursor-pointer hover:text-gray-900 leading-tight">
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
          )}

          {/* Document Uploads */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Profile Photo</Label>
              <Input type="file" accept="image/*" onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">ID Card (Image/PDF)</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => setIdCardFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <FileSignature className="h-3.5 w-3.5 text-indigo-600" />
                Digital Signature
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
              />
              <p className="text-[10px] text-muted-foreground">Auto-reformed to PNG • Permanent</p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { onOpenChange(false); resetForm() }}
              disabled={isPending || isUploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isUploading} className="bg-blue-600 hover:bg-blue-700">
              {(isPending || isUploading) ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isUploading ? "Uploading..." : "Creating..."}</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" /> Create Account</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// MANAGE DEPARTMENTS DIALOG
// ============================================

function ManageDepartmentsDialog({
  open,
  onOpenChange,
  departments,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  departments: string[]
  onSave: (updated: string[]) => void
}) {
  const [list, setList] = useState<string[]>([])
  const [newName, setNewName] = useState("")
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null)

  // Sync local list when dialog opens
  useEffect(() => {
    if (open) setList([...departments])
  }, [open, departments])

  const handleAdd = async () => {
    const trimmed = newName.trim()
    if (!trimmed) return toast.error("Department name is required")
    if (list.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error("Department already exists")
    }
    
    const result = await addHRDepartment(trimmed)
    if (result.success) {
      const updated = [...list, trimmed].sort()
      setList(updated)
      setNewName("")
      onSave(updated)
      toast.success(`"${trimmed}" added`)
    } else {
      toast.error(result.message || "Failed to add department")
    }
  }

  const handleRename = async (idx: number) => {
    const trimmed = editName.trim()
    if (!trimmed) return toast.error("Name cannot be empty")
    if (list.some((d, i) => i !== idx && d.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error("Department already exists")
    }
    
    const oldName = list[idx]
    const result = await renameHRDepartment(oldName, trimmed)
    if (result.success) {
      const updated = list.map((d, i) => (i === idx ? trimmed : d)).sort()
      setList(updated)
      setEditingIdx(null)
      onSave(updated)
      toast.success("Department renamed")
    } else {
      toast.error(result.message || "Failed to rename department")
    }
  }

  const handleDelete = async (idx: number) => {
    const deptName = list[idx]
    const result = await deleteHRDepartment(deptName)
    if (result.success) {
      const updated = list.filter((_, i) => i !== idx)
      setList(updated)
      setDeletingIdx(null)
      onSave(updated)
      toast.success(`"${deptName}" removed`)
    } else {
      toast.error(result.message || "Failed to delete department")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-blue-600" /> Manage Departments
          </DialogTitle>
          <DialogDescription>
            Add, rename, or remove HR departments. Changes apply immediately to the department selector.
          </DialogDescription>
        </DialogHeader>

        {/* Add new */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New department name..."
            className="text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
          />
          <Button size="sm" onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Department list */}
        <div className="mt-1 max-h-80 overflow-y-auto space-y-1.5">
          {list.map((dept, idx) => (
            <div key={idx} className="bg-gray-50 rounded-md text-sm">
              {deletingIdx === idx ? (
                <div className="px-3 py-2.5 space-y-2">
                  <p className="text-xs text-red-700 font-medium">Remove &quot;{dept}&quot;?</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => setDeletingIdx(null)}>Cancel</Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs flex-1" onClick={() => handleDelete(idx)}>Confirm</Button>
                  </div>
                </div>
              ) : editingIdx === idx ? (
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-xs flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleRename(idx) }
                      if (e.key === "Escape") setEditingIdx(null)
                    }}
                  />
                  <Button size="sm" className="h-7 w-7 p-0 bg-blue-600 hover:bg-blue-700" onClick={() => handleRename(idx)} title="Save">
                    <span className="text-xs">✓</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingIdx(null)} title="Cancel">
                    <span className="text-xs">✕</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-medium">{dept}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50" title="Rename"
                      onClick={() => { setEditingIdx(idx); setEditName(dept) }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50" title="Delete"
                      onClick={() => setDeletingIdx(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import React, { useState, useEffect } from "react"
import { getSurgeryStaff, addSurgeryStaff, updateSurgeryStaff, removeSurgeryStaff, getAvailableStaff, getSurgeryChargeBreakdown } from "@/app/actions/ot-staff"
import { toast } from "sonner"
import { Users, Loader2, Plus, X, Pencil, Check, Trash2, IndianRupee } from "lucide-react"

// All possible roles (fallback when no charges have requiresAssignment)
const ALL_ROLES = ["Assistant Surgeon", "Anesthetist", "Scrub Nurse", "Circulating Nurse", "OT Technician"]

export function OTStaffAssignments({ surgeryId }: { surgeryId: string }) {
  const [staffList, setStaffList] = useState<any[]>([])
  const [availableStaff, setAvailableStaff] = useState<any[]>([])
  // Maps role label → amount for auto-fill
  const [roleAmountMap, setRoleAmountMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState<number>(0)

  // Assignable roles derived from procedure template
  const [assignableRoles, setAssignableRoles] = useState<string[]>([])

  // New staff form
  const [newStaffId, setNewStaffId] = useState("")
  const [newRole, setNewRole] = useState("")
  const [newAmount, setNewAmount] = useState(0)

  useEffect(() => {
    loadData()
  }, [surgeryId])

  const loadData = async () => {
    setLoading(true)
    const [staffRes, availableRes, chargesRes] = await Promise.all([
      getSurgeryStaff(surgeryId),
      getAvailableStaff(),
      getSurgeryChargeBreakdown(surgeryId),
    ])
    
    if (staffRes.success) setStaffList(staffRes.staff || [])
    if (availableRes.success) setAvailableStaff(availableRes.staff || [])
    
    // Build label → amount map from assignable charges
    if (chargesRes.success && chargesRes.charges) {
      const labelMap: Record<string, number> = {}
      const roles: string[] = []
      for (const c of chargesRes.charges) {
        // Use the chargeLabel directly as the role name
        labelMap[c.chargeLabel] = c.amount
        if (c.requiresAssignment) {
          roles.push(c.chargeLabel)
        }
      }
      setRoleAmountMap(labelMap)
      setAssignableRoles(roles)
      
      // Auto-select the first assignable role
      const effectiveRoles = roles.length > 0 ? roles : ALL_ROLES
      if (effectiveRoles.length > 0) {
        setNewRole(effectiveRoles[0])
        setNewAmount(labelMap[effectiveRoles[0]] || 0)
      }
    }
    setLoading(false)
  }

  // Auto-fill payment when role changes
  const handleRoleChange = (role: string) => {
    setNewRole(role)
    setNewAmount(roleAmountMap[role] || 0)
  }

  const handleAdd = async () => {
    if (!newStaffId) return toast.error("Please select a staff member")
    
    const res = await addSurgeryStaff(surgeryId, { staffId: newStaffId, role: newRole, paymentAmount: newAmount })
    if (res.success) {
      toast.success("Staff assigned successfully")
      setIsAdding(false)
      setNewStaffId("")
      loadData()
    } else {
      toast.error(res.error)
    }
  }

  // Compute roles not yet assigned
  const assignedRoles = new Set(staffList.map(a => a.role))
  const effectiveRoles = assignableRoles.length > 0 ? assignableRoles : ALL_ROLES
  const availableRoles = effectiveRoles.filter(r => !assignedRoles.has(r))

  const handleRemove = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this staff member?")) return
    const res = await removeSurgeryStaff(id)
    if (res.success) {
      toast.success("Staff removed")
      loadData()
    } else {
      toast.error(res.error)
    }
  }

  const handleSaveEdit = async (id: string) => {
    const res = await updateSurgeryStaff(id, { paymentAmount: editAmount })
    if (res.success) {
      toast.success("Payment updated")
      setEditingId(null)
      loadData()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="p-6 bg-[#FAFAFA] border border-gray-200/60 rounded-[2rem] mt-6 relative overflow-hidden group">
      {/* Background Double-Bezel Highlight */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none rounded-[2rem]"></div>
      
      <div className="relative z-10 flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shadow-sm border border-blue-200">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          Operation Team
        </h3>
        {availableRoles.length > 0 && (
          <button 
            onClick={() => {
              setIsAdding(!isAdding)
              if (!isAdding && availableRoles.length > 0) {
                setNewRole(availableRoles[0])
                setNewAmount(roleAmountMap[availableRoles[0]] || 0)
              }
            }}
            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shadow-blue-600/20"
          >
            {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        )}
      </div>

      {isAdding && (
        <div className="p-5 bg-white border border-blue-100 rounded-[1.5rem] mb-6 flex flex-col md:flex-row gap-4 items-end shadow-sm">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Select Staff</label>
            <select 
              value={newStaffId} 
              onChange={(e) => setNewStaffId(e.target.value)}
              className="w-full h-11 bg-gray-50 border-0 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600"
            >
              <option value="">-- Choose Staff --</option>
              {availableStaff.map(s => (
                <option key={s.id} value={s.id}>{s.user.name} {s.specialization ? `(${s.specialization})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Role</label>
            <select 
              value={newRole} 
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full h-11 bg-gray-50 border-0 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600"
            >
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <div className="w-32 shrink-0">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Payment (₹)</label>
            <input 
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(Number(e.target.value))}
              className="w-full h-11 bg-gray-50 border-0 rounded-xl px-4 text-sm font-semibold outline-none ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button 
            onClick={handleAdd}
            className="h-11 px-6 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm shadow-blue-600/20 hover:bg-blue-700 active:scale-95 transition-all"
          >
            Assign
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : staffList.length === 0 ? (
        <div className="py-8 text-center text-sm font-medium text-gray-400">No additional staff assigned yet.</div>
      ) : (
        <div className="space-y-3 relative z-10">
          {staffList.map((assignment) => (
            <div key={assignment.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group hover:border-blue-200 hover:shadow-sm transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase">
                  {assignment.staff.user.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{assignment.staff.user.name}</h4>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{assignment.role}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {editingId === assignment.id ? (
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1 pr-2 border border-blue-200">
                    <input 
                      type="number" 
                      value={editAmount}
                      onChange={(e) => setEditAmount(Number(e.target.value))}
                      className="w-20 bg-transparent text-sm font-bold text-right outline-none px-2"
                    />
                    <button onClick={() => handleSaveEdit(assignment.id)} className="w-7 h-7 bg-emerald-500 text-white rounded-md flex items-center justify-center hover:bg-emerald-600">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm font-bold text-gray-700">
                      <IndianRupee className="w-4 h-4 text-gray-400" />
                      {assignment.paymentAmount}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingId(assignment.id); setEditAmount(assignment.paymentAmount); }}
                        className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleRemove(assignment.id)}
                        className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

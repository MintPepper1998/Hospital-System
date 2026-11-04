"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { getAvailableBeds, transferBed } from "@/app/actions/bed-transfer"
import { Loader2, ArrowRight, BedDouble, Info, CheckCircle2, Search, X } from "lucide-react"
import { toast } from "sonner"

export function TransferBedDialog({
  open,
  onOpenChange,
  admissionId,
  currentBedId,
  patientName
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  admissionId: string
  currentBedId: string
  patientName: string
}) {
  const [beds, setBeds] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null)
  const [reason, setReason] = useState("")
  const [authorizedBy, setAuthorizedBy] = useState("")
  const [notes, setNotes] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (open) {
      fetchBeds()
      // reset states
      setSelectedBedId(null)
      setReason("")
      setAuthorizedBy("")
      setNotes("")
      setSearch("")
    }
  }, [open, currentBedId])

  const fetchBeds = async () => {
    setFetching(true)
    try {
      const data = await getAvailableBeds(currentBedId)
      setBeds(data)
    } catch (error) {
      toast.error("Failed to load available beds")
    } finally {
      setFetching(false)
    }
  }

  const handleTransfer = async () => {
    if (!selectedBedId) return
    
    setLoading(true)
    try {
      const result = await transferBed({
        admissionId,
        newBedId: selectedBedId,
        reason,
        authorizedBy,
        notes
      })

      if (result.success) {
        toast.success("Patient transferred successfully")
        onOpenChange(false)
      } else {
        toast.error(result.error || "Failed to transfer bed")
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const selectedBed = beds.find(b => b.id === selectedBedId)
  
  const filteredBeds = beds.filter(b => 
    b.wardName.toLowerCase().includes(search.toLowerCase()) || 
    b.bedNumber.toLowerCase().includes(search.toLowerCase())
  )

  // Group by ward
  const bedsByWard = filteredBeds.reduce((acc: any, bed: any) => {
    if (!acc[bed.wardName]) acc[bed.wardName] = []
    acc[bed.wardName].push(bed)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Massive Center Modal instead of pure fullscreen for a more premium layered feel */}
      <DialogContent className="!max-w-[95vw] w-full h-[95vh] p-0 overflow-hidden bg-[#FAFAFA] border-0 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] rounded-[3rem] flex flex-col md:flex-row">
        
        {/* LEFT PANEL: Bed Selection */}
        <div className="flex-1 flex flex-col h-full bg-white relative">
          
          <div className="p-8 pb-4 flex flex-col gap-6 shrink-0 relative z-10 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-3xl font-bold tracking-tight text-gray-900">Select New Bed</DialogTitle>
                <p className="text-sm font-medium text-gray-500 mt-1">Transferring {patientName}</p>
              </div>
              <button 
                onClick={() => onOpenChange(false)}
                className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0 md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search wards or bed numbers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-[1.5rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
            {fetching ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            ) : Object.keys(bedsByWard).length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <BedDouble className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-sm font-bold">No available beds found</p>
              </div>
            ) : (
              <div className="space-y-10">
                {Object.entries(bedsByWard).map(([wardName, wardBeds]: [string, any]) => (
                  <div key={wardName}>
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-lg font-bold text-gray-900">{wardName}</h3>
                      <div className="h-px flex-1 bg-gray-100"></div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-3 py-1 rounded-full">{wardBeds.length} Available</span>
                    </div>
                    
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {wardBeds.map((bed: any) => {
                        const isSelected = selectedBedId === bed.id
                        return (
                          <div 
                            key={bed.id}
                            onClick={() => setSelectedBedId(bed.id)}
                            className={`group relative p-1 rounded-[1.5rem] cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                              isSelected ? 'bg-blue-600 shadow-xl shadow-blue-600/20 scale-[0.98]' : 'bg-gray-50 hover:bg-gray-100 hover:scale-[1.02]'
                            }`}
                          >
                            <div className={`p-4 rounded-[calc(1.5rem-0.25rem)] h-full flex flex-col justify-between gap-4 transition-colors ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 shadow-sm border border-gray-100/50'
                            }`}>
                              <div className="flex items-start justify-between">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                                  <BedDouble className="w-5 h-5" />
                                </div>
                                {isSelected && <CheckCircle2 className="w-5 h-5 text-white" />}
                              </div>
                              
                              <div>
                                <div className="text-2xl font-bold tracking-tight">{bed.bedNumber}</div>
                                <div className={`text-xs font-semibold mt-1 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                                  ₹{bed.pricePerDay.toLocaleString()}/day
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Transfer Details */}
        <div className="w-full md:w-[450px] lg:w-[500px] shrink-0 bg-[#FAFAFA] border-l border-gray-200/60 p-8 flex flex-col h-full overflow-y-auto">

          <div className="flex-1 mt-2">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Transfer Details</h3>
            
            <div className="space-y-6">
              {/* Selected Bed Summary */}
              {selectedBed ? (
                <div className="p-1 bg-white border border-gray-200 rounded-[1.5rem] shadow-sm">
                  <div className="p-5 bg-blue-50/50 rounded-[calc(1.5rem-0.25rem)]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Selected Bed</span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{selectedBed.bedNumber}</div>
                    <div className="text-sm font-medium text-gray-500 mt-1">{selectedBed.wardName} &bull; ₹{selectedBed.pricePerDay.toLocaleString()}/day</div>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 border border-gray-200 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <BedDouble className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-500">Please select a target bed<br/>from the available list</p>
                </div>
              )}

              <div className="space-y-2 pt-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Reason for Transfer</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Patient requested upgrade"
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Authorized By</label>
                <input
                  type="text"
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  placeholder="e.g. Dr. Smith"
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any other details..."
                  rows={4}
                  className="w-full px-5 py-4 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200/60">
            <button
              onClick={handleTransfer}
              disabled={loading || !selectedBed}
              className="w-full group relative flex items-center justify-between bg-black text-white px-8 py-5 rounded-full text-base font-bold tracking-wide overflow-hidden active:scale-[0.98] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-xl hover:shadow-black/20 disabled:opacity-50 disabled:active:scale-100 disabled:hover:shadow-none"
            >
              <div className="flex items-center gap-3">
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                <span>{loading ? "Transferring..." : "Confirm Transfer"}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-2 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
            </button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

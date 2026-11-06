"use client"

import { useState, useEffect, useMemo, useTransition } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Microscope, Radiation, Search, Check, Plus } from "lucide-react"
import {
  getDiagnosticCatalogTests,
  orderCasualtyDiagnostics,
} from "@/lib/actions/diagnostics"

interface OrderDiagnosticsModalProps {
  isOpen: boolean
  onClose: () => void
  visit: {
    id: string
    patient: {
      user: { name: string | null }
      patientId: string
    }
  }
}

interface TestItem {
  id: string
  name: string
  code: string | null
  price: number
  category: string | null
  type: "PATHOLOGY" | "RADIOLOGY"
  unit: string | null
  normalRange: string | null
}

export function OrderDiagnosticsModal({
  isOpen,
  onClose,
  visit,
}: OrderDiagnosticsModalProps) {
  const [tests, setTests] = useState<TestItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isSubmitting, startTransition] = useTransition()

  const [activeTab, setActiveTab] = useState<"ALL" | "PATHOLOGY" | "RADIOLOGY">("ALL")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (isOpen) {
      loadTests()
      setSelectedIds([])
      setSearchTerm("")
      setNotes("")
    }
  }, [isOpen])

  const loadTests = async () => {
    setLoading(true)
    const res = await getDiagnosticCatalogTests()
    if (res.success && res.data) {
      setTests(res.data as TestItem[])
    }
    setLoading(false)
  }

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      if (activeTab !== "ALL" && t.type !== activeTab) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const matchName = t.name.toLowerCase().includes(q)
        const matchCode = t.code?.toLowerCase().includes(q)
        const matchCat = t.category?.toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchCat) return false
      }
      return true
    })
  }, [tests, activeTab, searchTerm])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const selectedTests = useMemo(() => {
    return tests.filter((t) => selectedIds.includes(t.id))
  }, [tests, selectedIds])

  const totalCost = selectedTests.reduce((sum, t) => sum + t.price, 0)

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one test to order")
      return
    }

    startTransition(async () => {
      const res = await orderCasualtyDiagnostics({
        casualtyVisitId: visit.id,
        testCatalogIds: selectedIds,
        notes: notes.trim() || undefined,
      })

      if (res.success) {
        toast.success(res.message)
        onClose()
      } else {
        toast.error(res.message || "Failed to order tests")
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col p-5 bg-white rounded-2xl shadow-xl">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-100 text-teal-700 rounded-lg">
              <Microscope className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-900">
                Order Diagnostic Tests
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                For {visit.patient.user.name || "Patient"} ({visit.patient.patientId})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search & Tabs Filter */}
        <div className="space-y-2.5 pt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tests by name, code, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <Tabs
              value={activeTab}
              onValueChange={(v: any) => setActiveTab(v)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 h-8 w-full p-0.5 bg-muted/60">
                <TabsTrigger value="ALL" className="text-xs">
                  All ({tests.length})
                </TabsTrigger>
                <TabsTrigger value="PATHOLOGY" className="text-xs flex items-center gap-1">
                  <Microscope className="h-3 w-3" /> Pathology
                </TabsTrigger>
                <TabsTrigger value="RADIOLOGY" className="text-xs flex items-center gap-1">
                  <Radiation className="h-3 w-3" /> Radiology
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Tests List */}
        <div className="flex-1 overflow-y-auto max-h-60 border rounded-xl divide-y my-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No matching diagnostic tests found
            </div>
          ) : (
            filteredTests.map((t) => {
              const isSelected = selectedIds.includes(t.id)
              const isRadiology = t.type === "RADIOLOGY"

              return (
                <div
                  key={t.id}
                  onClick={() => toggleSelect(t.id)}
                  className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                    isSelected ? "bg-teal-50/80 font-medium" : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-5 w-5 rounded border flex items-center justify-center text-xs flex-shrink-0 ${
                        isSelected
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-zinc-900 truncate">
                          {t.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 ${
                            isRadiology
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {isRadiology ? "Radiology" : "Pathology"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-zinc-500">
                        {t.category || "General"} {t.code ? `• ${t.code}` : ""}
                      </p>
                    </div>
                  </div>

                  <span className="font-bold text-zinc-900 text-xs flex-shrink-0">
                    ₹{t.price.toLocaleString("en-IN")}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Notes Input */}
        <div className="space-y-1">
          <Input
            placeholder="Clinical notes / Urgency (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        {/* Selected Summary and Footer */}
        <DialogFooter className="pt-3 border-t flex flex-row items-center justify-between sm:justify-between gap-2">
          <div className="text-xs">
            <span className="text-zinc-500">Selected: </span>
            <span className="font-bold text-zinc-900">
              {selectedIds.length} test(s)
            </span>
            <span className="text-zinc-500 ml-2">Total: </span>
            <span className="font-extrabold text-teal-700">
              ₹{totalCost.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || selectedIds.length === 0}
              onClick={handleSubmit}
              className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1" />
              )}
              Order Tests
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, Plus, Pill } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

// Dummy Medicine Database
const MEDICINE_DB = [
  { name: "Augmentin 625", dosage: "625mg", type: "Tablet" },
  { name: "Azithromycin 500", dosage: "500mg", type: "Tablet" },
  { name: "Dolo 650", dosage: "650mg", type: "Tablet" },
  { name: "Paracetamol 500", dosage: "500mg", type: "Tablet" },
  { name: "Pan-D", dosage: "1 capsule", type: "Capsule" },
  { name: "Pantoprazole 40", dosage: "40mg", type: "Tablet" },
  { name: "Telma 40", dosage: "40mg", type: "Tablet" },
  { name: "Metformin 500", dosage: "500mg", type: "Tablet" },
  { name: "Amoxyclav 625", dosage: "625mg", type: "Tablet" },
  { name: "Cefixime 200", dosage: "200mg", type: "Tablet" },
  { name: "Montelukast 10", dosage: "10mg", type: "Tablet" },
  { name: "Cetirizine 10", dosage: "10mg", type: "Tablet" },
  { name: "Omeprazole 20", dosage: "20mg", type: "Capsule" },
  { name: "Amlodipine 5", dosage: "5mg", type: "Tablet" },
  { name: "Atorvastatin 10", dosage: "10mg", type: "Tablet" },
]

const FREQUENCIES = [
  { code: "1-0-1", label: "1-0-1 (Morning-Night)" },
  { code: "1-0-0", label: "1-0-0 (Morning only)" },
  { code: "0-0-1", label: "0-0-1 (Night only)" },
  { code: "0-1-0", label: "0-1-0 (Afternoon only)" },
  { code: "1-1-1", label: "1-1-1 (Three times)" },
  { code: "1-1-0", label: "1-1-0 (Morning-Afternoon)" },
  { code: "0-1-1", label: "0-1-1 (Afternoon-Night)" },
  { code: "SOS", label: "SOS (As needed)" },
]

const INSTRUCTIONS = [
  "After Food",
  "Before Food",
  "With Warm Water",
  "Empty Stomach",
  "At Bedtime",
  "With Milk",
  "After Breakfast",
  "After Dinner",
]

// Export the Medication type for use in other components
export interface Medication {
  id: string
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instructions: string
}

interface PrescriptionWriterProps {
  medications: Medication[]
  onMedicationsChange: (medications: Medication[]) => void
}

// Helper to create empty medication
const createEmptyMedication = (): Medication => ({
  id: crypto.randomUUID(),
  medicationName: "",
  dosage: "",
  frequency: "1-0-1",
  duration: "5 Days",
  quantity: 10,
  instructions: "After Food"
})

export function PrescriptionWriter({ 
  medications, 
  onMedicationsChange 
}: PrescriptionWriterProps) {
  const [openSearchIndex, setOpenSearchIndex] = useState<number | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [activeSearchTerm, setActiveSearchTerm] = useState("")
  const debouncedActiveSearchTerm = useDebouncedValue(activeSearchTerm, 250)

  // Initialize with one empty row if no medications provided
  useEffect(() => {
    if (medications.length === 0) {
      onMedicationsChange([createEmptyMedication()])
    }
  }, [])

  // Avoid Hydration Mismatch
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.medicine-search-container')) {
        setOpenSearchIndex(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isMounted) return null

  // Get current list (use prop directly since it's controlled)
  const medicineList = medications.length > 0 ? medications : [createEmptyMedication()]

  // Add New Row
  const addRow = () => {
    onMedicationsChange([...medicineList, createEmptyMedication()])
  }

  // Remove Row
  const removeRow = (index: number) => {
    if (medicineList.length === 1) return // Keep at least one row
    const updated = medicineList.filter((_, i) => i !== index)
    onMedicationsChange(updated)
  }

  // Update Field
  const updateField = (index: number, field: keyof Medication, value: string | number) => {
    const updated = [...medicineList]
    updated[index] = { ...updated[index], [field]: value }
    onMedicationsChange(updated)
  }

  // Handle Medicine Selection from Dropdown
  const selectMedicine = (index: number, med: typeof MEDICINE_DB[0]) => {
    const updated = [...medicineList]
    updated[index] = { 
      ...updated[index], 
      medicationName: med.name, 
      dosage: med.dosage 
    }
    onMedicationsChange(updated)
    setOpenSearchIndex(null) // Close dropdown
  }

  // Filter medicines based on search
  const getFilteredMedicines = (searchTerm: string) => {
    if (!searchTerm.trim()) return MEDICINE_DB
    const effectiveSearch =
      openSearchIndex !== null ? debouncedActiveSearchTerm : searchTerm
    if (!effectiveSearch.trim()) return MEDICINE_DB
    return MEDICINE_DB.filter(m => 
      m.name.toLowerCase().includes(effectiveSearch.toLowerCase())
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Pill className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-lg">Medicine</h3>
        </div>
        <Button onClick={addRow} size="sm" variant="outline" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Medicine
        </Button>
      </div>

      <div className="space-y-3">
        {medicineList.map((row, index) => (
          <div 
            key={row.id} 
            className="relative grid grid-cols-12 gap-2 items-start p-3 bg-muted/30 rounded-lg border"
          >
            {/* Row Number */}
            <div className="absolute -left-2 -top-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {index + 1}
            </div>

            {/* Medicine Search Input */}
            <div className="col-span-12 md:col-span-4 relative medicine-search-container">
              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                Medicine Name *
              </label>
              <Input
                placeholder="Search medicine..."
                value={row.medicationName}
                onChange={(e) => {
                  updateField(index, "medicationName", e.target.value)
                  setActiveSearchTerm(e.target.value)
                  setOpenSearchIndex(index)
                }}
                onFocus={() => {
                  setActiveSearchTerm(row.medicationName)
                  setOpenSearchIndex(index)
                }}
                className="font-medium"
              />

              {/* Custom Suggestion Dropdown */}
              {openSearchIndex === index && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {getFilteredMedicines(row.medicationName).length > 0 ? (
                    getFilteredMedicines(row.medicationName).map((med) => (
                      <div
                        key={med.name}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors border-b last:border-0"
                        onMouseDown={(e) => {
                          e.preventDefault() // Prevent blur before click
                          selectMedicine(index, med)
                        }}
                      >
                        <div className="font-medium">{med.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {med.dosage} • {med.type}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No medicines found. You can type a custom name.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dosage */}
            <div className="col-span-6 md:col-span-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                Dosage
              </label>
              <Input
                value={row.dosage}
                onChange={(e) => updateField(index, "dosage", e.target.value)}
                placeholder="e.g. 650mg"
              />
            </div>

            {/* Frequency */}
            <div className="col-span-6 md:col-span-2">
              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                Frequency *
              </label>
              <Select
                value={row.frequency}
                onValueChange={(val) => updateField(index, "frequency", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Freq">
                    <span className="font-mono font-semibold">{row.frequency}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.code} value={f.code}>
                      <span className="font-mono">{f.code}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        {f.label.replace(f.code + " ", "")}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="col-span-6 md:col-span-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                Duration
              </label>
              <Input
                value={row.duration}
                onChange={(e) => updateField(index, "duration", e.target.value)}
                placeholder="5 Days"
              />
            </div>

            {/* Quantity */}
            <div className="col-span-6 md:col-span-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                Qty
              </label>
              <Input
                value={row.quantity}
                onChange={(e) => updateField(index, "quantity", parseInt(e.target.value) || 0)}
                placeholder="10"
                type="number"
              />
            </div>

            {/* Instructions + Delete */}
            <div className="col-span-12 md:col-span-2 flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">
                  Instruction
                </label>
                <Select
                  value={row.instructions}
                  onValueChange={(val) => updateField(index, "instructions", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUCTIONS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 mb-0.5"
                onClick={() => removeRow(index)}
                disabled={medicineList.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{medicineList.filter(m => m.medicationName.trim()).length}</span> medicine(s)
        </div>
        <Button onClick={addRow} variant="outline" size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Another
        </Button>
      </div>
    </Card>
  )
}

// Default export for backwards compatibility
export default PrescriptionWriter

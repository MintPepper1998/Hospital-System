"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Syringe } from "lucide-react"
import { addCasualtyProcedure } from "@/app/actions/casualty"

const PROCEDURE_CATEGORIES = [
  { value: "OXYGEN", label: "🫁 Oxygen Therapy", defaultName: "Oxygen Administration", defaultPrice: 200 },
  { value: "PLASTER", label: "🦴 POP Cast / Plaster", defaultName: "POP Cast Application", defaultPrice: 800 },
  { value: "DRESSING", label: "🩹 Wound Dressing", defaultName: "Wound Dressing", defaultPrice: 300 },
  { value: "SUTURING", label: "🪡 Suturing", defaultName: "Wound Suturing", defaultPrice: 500 },
  { value: "INJECTION", label: "💉 Injection", defaultName: "Intramuscular Injection", defaultPrice: 100 },
  { value: "SPLINT", label: "🩼 Splint / Sling", defaultName: "Splint Application", defaultPrice: 400 },
  { value: "GENERAL", label: "⚕️ General Procedure", defaultName: "General Procedure", defaultPrice: 250 },
  { value: "OTHER", label: "🔧 Other", defaultName: "Other Procedure", defaultPrice: 0 },
]

const procedureSchema = z.object({
  category: z.string().min(1, "Select a category"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, "Must be at least 1"),
  unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
  performedBy: z.string().optional(),
})

interface AddProcedureModalProps {
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

export function AddProcedureModal({ isOpen, onClose, visit }: AddProcedureModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof procedureSchema>>({
    resolver: zodResolver(procedureSchema) as any,
    defaultValues: {
      category: "",
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      performedBy: "",
    },
  })

  function handleCategoryChange(value: string) {
    form.setValue("category", value)
    const cat = PROCEDURE_CATEGORIES.find((c) => c.value === value)
    if (cat) {
      form.setValue("name", cat.defaultName)
      form.setValue("unitPrice", cat.defaultPrice)
    }
  }

  async function onSubmit(values: z.infer<typeof procedureSchema>) {
    try {
      setIsLoading(true)
      await addCasualtyProcedure({
        casualtyVisitId: visit.id,
        name: values.name,
        category: values.category,
        description: values.description,
        quantity: values.quantity,
        unitPrice: values.unitPrice,
        performedBy: values.performedBy,
      })
      toast.success(`Procedure "${values.name}" added`)
      form.reset()
      onClose()
    } catch (err: any) {
      toast.error(err.message || "Failed to add procedure")
    } finally {
      setIsLoading(false)
    }
  }

  const total = (form.watch("unitPrice") || 0) * (form.watch("quantity") || 1)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-[#e0e5ec] border-0 rounded-[2rem] shadow-[20px_20px_60px_#bec3c9,-20px_-20px_60px_#ffffff]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <Syringe className="h-5 w-5" /> Add Procedure
          </DialogTitle>
          <p className="text-xs text-zinc-500 mt-0.5">
            Patient: <span className="font-semibold text-zinc-700">{visit.patient.user.name}</span> ({visit.patient.patientId})
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-zinc-600">Procedure Category</FormLabel>
                  <Select onValueChange={handleCategoryChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/70 border-0 neo-pressed rounded-xl text-sm">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROCEDURE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-zinc-600">Procedure Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. POP Cast — Left Arm" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-zinc-600">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="Additional details…" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm resize-none" />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Quantity + Price */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-zinc-600">Qty</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-zinc-600">Unit Price (₹)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col justify-end">
                <p className="text-xs text-zinc-500 font-medium">Total</p>
                <p className="text-lg font-bold text-blue-600">₹{total.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Performed By */}
            <FormField
              control={form.control}
              name="performedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-zinc-600">Performed By (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Nurse Priya" className="bg-white/70 border-0 neo-pressed rounded-xl text-sm" />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full neo-button bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-semibold"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Procedure
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

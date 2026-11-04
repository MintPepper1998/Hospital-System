"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Receipt, ArrowRightLeft, CreditCard } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createPharmacyVoucher } from "@/app/actions/pharmacy-fin/vouchers"

const VOUCHER_TYPES = [
  { value: "RECEIPT", label: "Receipt", icon: Receipt },
  { value: "PAYMENT", label: "Payment", icon: CreditCard },
  { value: "CONTRA", label: "Contra / Transfer", icon: ArrowRightLeft },
] as const

const formSchema = z.object({
  type: z.enum(["RECEIPT", "PAYMENT", "CONTRA"]),
  date: z.string().min(1, "Date is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  accountId: z.string().optional(),
  contraAccountId: z.string().optional(),
  partyName: z.string().optional(),
  particulars: z.string().min(3, "Particulars are required"),
  notes: z.string().optional(),
}).refine(data => {
  if (data.type === "CONTRA") {
    return !!data.accountId && !!data.contraAccountId && data.accountId !== data.contraAccountId
  }
  return !!data.accountId
}, {
  message: "Please select valid accounts",
  path: ["accountId"]
})

interface VoucherEntryFormProps {
  accounts: { id: string; name: string; type: string; currentBalance: number }[]
}

export function VoucherEntryForm({ accounts }: VoucherEntryFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const now = new Date()
  const defaultDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      type: "RECEIPT",
      date: defaultDate,
      amount: 0,
      accountId: "",
      contraAccountId: "",
      partyName: "",
      particulars: "",
      notes: "",
    },
  })

  const selectedType = form.watch("type")
  const selectedAccountId = form.watch("accountId")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    const result = await createPharmacyVoucher({
      ...values,
      accountId: values.accountId || undefined,
      contraAccountId: values.contraAccountId || undefined,
    })
    setIsSubmitting(false)

    if (result.success) {
      toast.success(result.message)
      form.reset({
        ...values,
        amount: 0,
        partyName: "",
        particulars: "",
        notes: "",
        date: defaultDate
      })
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Voucher Type</FormLabel>
              <div className="grid grid-cols-3 gap-3">
                {VOUCHER_TYPES.map((type) => {
                  const Icon = type.icon
                  const isActive = field.value === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        field.onChange(type.value)
                        form.setValue("accountId", "")
                        form.setValue("contraAccountId", "")
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        isActive 
                          ? "border-primary bg-primary/5 text-primary shadow-sm" 
                          : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <span className="text-xs font-semibold">{type.label}</span>
                    </button>
                  )
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} className="bg-muted/30" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (₹)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} className="font-mono text-lg" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {selectedType !== "CONTRA" && (
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{selectedType === "RECEIPT" ? "Received In (Account)" : "Paid From (Account)"}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} — <span className="font-mono text-xs opacity-70">₹{acc.currentBalance.toFixed(2)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {selectedType === "CONTRA" && (
          <div className="grid grid-cols-1 gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Account (Source)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Source Account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} — <span className="font-mono text-xs opacity-70">₹{acc.currentBalance.toFixed(2)}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-center -my-2 relative z-10">
              <div className="bg-background rounded-full p-1 border shadow-sm">
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground rotate-90 md:rotate-0" />
              </div>
            </div>

            <FormField
              control={form.control}
              name="contraAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Account (Destination)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Destination Account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.filter(a => a.id !== selectedAccountId).map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} — <span className="font-mono text-xs opacity-70">₹{acc.currentBalance.toFixed(2)}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {selectedType !== "CONTRA" && (
          <FormField
            control={form.control}
            name="partyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{selectedType === "RECEIPT" ? "Received From (Party Name)" : "Paid To (Party Name)"}</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. John Doe / Vendor Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="particulars"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Particulars / Narration</FormLabel>
              <FormControl>
                <Input placeholder="Brief description of the transaction" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Internal Notes <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional context..." className="resize-none h-20" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full rounded-xl py-6 font-semibold">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing Voucher...
            </>
          ) : (
            `Post ${selectedType === "RECEIPT" ? "Receipt" : selectedType === "PAYMENT" ? "Payment" : "Contra Entry"}`
          )}
        </Button>
      </form>
    </Form>
  )
}

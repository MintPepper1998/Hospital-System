"use client"

import * as React from "react"
import { getPharmacyAccounts } from "@/lib/pharmacy-finance/actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { inr } from "@/lib/pharmacy-finance/money"

export function AccountSelect({
  value,
  onChange,
  requireBalance,
  disabled,
  placeholder = "Select Account",
}: {
  value?: string
  onChange: (value: string) => void
  requireBalance?: number
  disabled?: boolean
  placeholder?: string
}) {
  const [accounts, setAccounts] = React.useState<{ id: string; name: string; currentBalance: number }[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    getPharmacyAccounts().then((data) => {
      setAccounts(data)
      setLoading(false)
    })
  }, [])

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={loading ? "Loading accounts..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((acc) => {
          const isDisabled = requireBalance !== undefined && acc.currentBalance < requireBalance
          return (
            <SelectItem key={acc.id} value={acc.id} disabled={isDisabled}>
              {acc.name} - Bal: {inr(acc.currentBalance)}
              {isDisabled ? " (Insufficient)" : ""}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Package, MoreHorizontal, Trash2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditMedicineDialog } from "./edit-medicine-dialog"
import { deleteMedicine } from "@/lib/actions"
import { toast } from "sonner"
import { useTransition } from "react"

interface MedicinesTableProps {
  medicines: any[]
  medicineTypes?: string[]
}

export function MedicinesTable({ medicines, medicineTypes = [] }: MedicinesTableProps) {
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input (300ms)
  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim().toLowerCase())
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Filter medicines based on debounced query
  const filteredMedicines = useMemo(() => {
    if (!debouncedQuery) return medicines
    return medicines.filter((m: any) =>
      m.name?.toLowerCase().startsWith(debouncedQuery) ||
      m.genericName?.toLowerCase().startsWith(debouncedQuery) ||
      m.type?.toLowerCase().startsWith(debouncedQuery) ||
      m.manufacturer?.toLowerCase().startsWith(debouncedQuery) ||
      m.strength?.toLowerCase().startsWith(debouncedQuery)
    )
  }, [medicines, debouncedQuery])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this medicine?")) {
      startTransition(async () => {
        const result = await deleteMedicine(id)
        if (result.success) {
          toast.success(result.message)
        } else {
          toast.error(result.message)
        }
      })
    }
  }

  if (medicines.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-semibold">No medicines added yet</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Click "Add Medicine" to create your first medicine entry
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search medicines..."
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 pr-9 h-9"
        />
        {searchInput && (
          <button
            onClick={() => { setSearchInput(""); setDebouncedQuery("") }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {debouncedQuery && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredMedicines.length} of {medicines.length} medicines
        </p>
      )}

      {filteredMedicines.length === 0 ? (
        <div className="text-center py-8">
          <Search className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
          <p className="mt-3 text-sm text-muted-foreground">No medicines match &quot;{searchInput}&quot;</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine Name</TableHead>
                <TableHead>Generic Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">MRP (₹)</TableHead>
                <TableHead className="text-right">Total Stock</TableHead>
                <TableHead className="text-right">Min Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMedicines.map((medicine: any) => (
                <TableRow key={medicine.id}>
                  <TableCell className="font-medium">{medicine.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {medicine.genericName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{medicine.type}</Badge>
                  </TableCell>
                  <TableCell>{medicine.strength || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {medicine.manufacturer || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {medicine.storageLocation || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(medicine.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {medicine.totalStock}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {medicine.minStockLevel}
                  </TableCell>
                  <TableCell>
                    {medicine.totalStock === 0 ? (
                      <Badge variant="destructive">Out of Stock</Badge>
                    ) : medicine.isLowStock ? (
                      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        In Stock
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <EditMedicineDialog medicine={medicine} medicineTypes={medicineTypes} />
                        <DropdownMenuItem
                          className="text-red-600 focus:bg-red-50"
                          onClick={() => handleDelete(medicine.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}


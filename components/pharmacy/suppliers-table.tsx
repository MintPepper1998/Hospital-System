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
import { Users, MoreHorizontal, Trash2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditSupplierDialog } from "./edit-supplier-dialog"
import { deleteSupplier } from "@/lib/actions"
import { toast } from "sonner"
import { useTransition } from "react"

interface SuppliersTableProps {
  suppliers: any[]
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
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

  // Filter suppliers based on debounced query
  const filteredSuppliers = useMemo(() => {
    if (!debouncedQuery) return suppliers
    return suppliers.filter((s: any) =>
      s.name?.toLowerCase().startsWith(debouncedQuery) ||
      s.contactPerson?.toLowerCase().startsWith(debouncedQuery) ||
      s.phone?.toLowerCase().startsWith(debouncedQuery) ||
      s.email?.toLowerCase().startsWith(debouncedQuery) ||
      s.city?.toLowerCase().startsWith(debouncedQuery) ||
      s.state?.toLowerCase().startsWith(debouncedQuery) ||
      s.gstNumber?.toLowerCase().startsWith(debouncedQuery)
    )
  }, [suppliers, debouncedQuery])

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      startTransition(async () => {
        const result = await deleteSupplier(id)
        if (result.success) {
          toast.success(result.message)
        } else {
          toast.error(result.message)
        }
      })
    }
  }

  if (suppliers.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-semibold">No suppliers added yet</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Click "Add Supplier" to create your first vendor record
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
          placeholder="Search suppliers..."
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
          Showing {filteredSuppliers.length} of {suppliers.length} suppliers
        </p>
      )}

      {filteredSuppliers.length === 0 ? (
        <div className="text-center py-8">
          <Search className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
          <p className="mt-3 text-sm text-muted-foreground">No suppliers match &quot;{searchInput}&quot;</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>GST Number</TableHead>
                <TableHead>Credit Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.map((supplier: any) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contactPerson || "-"}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{supplier.phone || "-"}</div>
                      <div className="text-muted-foreground">{supplier.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{supplier.city || "-"}</div>
                      <div className="text-muted-foreground">{supplier.state}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.gstNumber ? (
                      <Badge variant="outline" className="font-mono">
                        {supplier.gstNumber}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{supplier.creditDays || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                      Active
                    </Badge>
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
                        <EditSupplierDialog supplier={supplier} />
                        <DropdownMenuItem
                          className="text-red-600 focus:bg-red-50"
                          onClick={() => handleDelete(supplier.id)}
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


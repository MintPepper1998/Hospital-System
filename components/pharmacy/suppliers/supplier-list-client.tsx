"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  Search,
  IndianRupee,
  Phone,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import type { SupplierListItem } from "@/app/actions/supplier-profile"

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)

export function SupplierListClient({ suppliers }: { suppliers: SupplierListItem[] }) {
  const [search, setSearch] = useState("")

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.gstNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search) ||
    s.city?.toLowerCase().includes(search.toLowerCase())
  )

  const totalDue = suppliers.reduce((sum, s) => sum + Math.max(0, s.balanceDue), 0)
  const totalPurchased = suppliers.reduce((sum, s) => sum + s.totalPurchased, 0)
  const suppliersWithDues = suppliers.filter((s) => s.balanceDue > 1).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
            <Users className="h-8 w-8" />
            Suppliers
          </h2>
          <p className="text-muted-foreground mt-1">
            Pharmacy supplier ledger — hospital-only suppliers are excluded. Scope <strong>Both</strong> is shared across pharmacy and hospital.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPurchased)}</div>
            <p className="text-xs text-muted-foreground mt-1">From {suppliers.length} supplier(s)</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance Due</CardTitle>
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalDue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{suppliersWithDues} supplier(s) with dues</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fully Paid</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{suppliers.length - suppliersWithDues}</div>
            <p className="text-xs text-muted-foreground mt-1">Supplier(s) with zero balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">All Suppliers</CardTitle>
              <CardDescription>{filtered.length} of {suppliers.length} shown</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, GST, phone, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>City</TableHead>
                <TableHead className="text-right">Purchased</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Last Purchase</TableHead>
                <TableHead className="text-right">Profile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    {search ? "No suppliers match your search" : "No suppliers found"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id} className="group hover:bg-blue-50/50">
                    <TableCell>
                      <Link
                        href={`/dashboard/pharmacy/suppliers/${s.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {s.name}
                      </Link>
                      {!s.isActive && (
                        <Badge variant="secondary" className="ml-2 text-xs">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{s.scope}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {s.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {s.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {s.gstNumber || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.city || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(s.totalPurchased)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-green-600">
                      {formatCurrency(s.totalPaid)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {s.balanceDue > 1 ? (
                        <span className="text-red-600">{formatCurrency(s.balanceDue)}</span>
                      ) : s.balanceDue < -1 ? (
                        <span className="text-blue-600">{formatCurrency(s.balanceDue)} (Advance)</span>
                      ) : (
                        <span className="text-green-600">₹0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{s.invoiceCount}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.lastPurchaseDate
                        ? format(new Date(s.lastPurchaseDate), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/pharmacy/suppliers/${s.id}`}>
                        <Button variant="ghost" size="sm" className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          View <ArrowRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

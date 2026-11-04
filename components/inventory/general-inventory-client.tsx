"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Package,
  AlertTriangle,
  Building2,
  Plus,
  Loader2,
  Boxes,
  Search,
  Pencil,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  addDepartment,
  addGeneralItem,
  updateGeneralItem,
  deleteGeneralItem,
  updateDepartment,
  deleteDepartment,
  type DepartmentData,
  type GeneralItemData,
} from "@/app/actions/general-inventory"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

// ============================================
// MAIN
// ============================================

interface Props {
  items: GeneralItemData[]
  departments: DepartmentData[]
  stats: { totalItems: number; lowStockItems: number; departments: number }
}

export function GeneralInventoryClient({ items, departments, stats }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const [deptFilter, setDeptFilter] = useState("ALL")

  const filtered = items.filter((i) => {
    const matchesSearch = !debouncedSearch || i.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchesDept = deptFilter === "ALL" || i.departmentId === deptFilter
    return matchesSearch && matchesDept
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Boxes className="h-6 w-6 text-indigo-600" />
            Hospital Assets & General Inventory
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track non-pharmacy items across departments
          </p>
        </div>
        <div className="flex gap-2">
          <ManageDepartmentsDialog departments={departments} onDone={() => router.refresh()} />
          <AddItemDialog departments={departments} onDone={() => router.refresh()} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Items</p>
                <p className="text-2xl font-bold mt-1">{stats.totalItems}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${stats.lowStockItems > 0 ? "border-l-red-500" : "border-l-green-500"}`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Low Stock Alerts</p>
                <p className={`text-2xl font-bold mt-1 ${stats.lowStockItems > 0 ? "text-red-600" : "text-green-600"}`}>
                  {stats.lowStockItems}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stats.lowStockItems > 0 ? "bg-red-100" : "bg-green-100"}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.lowStockItems > 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Departments</p>
                <p className="text-2xl font-bold mt-1">{stats.departments}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Inventory Items ({filtered.length})</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-56">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items..."
                  className="h-8 text-xs pl-8"
                />
              </div>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No items found</p>
              <p className="text-xs mt-1">Add items or adjust your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-sm">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {item.departmentName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold">
                        {item.stock}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.unit}</TableCell>
                      <TableCell>
                        {item.isLowStock ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                            In Stock
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <EditItemDialog item={item} departments={departments} onDone={() => router.refresh()} />
                          <DeleteItemButton item={item} onDone={() => router.refresh()} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// ADD ITEM DIALOG
// ============================================

function AddItemDialog({ departments, onDone }: { departments: DepartmentData[]; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [unit, setUnit] = useState("pcs")
  const [minStock, setMinStock] = useState("5")
  const [stock, setStock] = useState("0")

  const reset = () => { setName(""); setDepartmentId(""); setUnit("pcs"); setMinStock("5"); setStock("0") }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error("Item name is required")
    if (!departmentId) return toast.error("Select a department")

    startTransition(async () => {
      const result = await addGeneralItem({
        name,
        departmentId,
        unit,
        minStock: parseInt(minStock) || 5,
        stock: parseInt(stock) || 0,
      })
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        reset()
        onDone()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" /> Add New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add General Inventory Item</DialogTitle>
          <DialogDescription>Track a new non-pharmacy item</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Item Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Surgical Gloves (Box)" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Department <span className="text-red-500">*</span></Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Pieces</SelectItem>
                  <SelectItem value="boxes">Boxes</SelectItem>
                  <SelectItem value="liters">Liters</SelectItem>
                  <SelectItem value="kg">Kilograms</SelectItem>
                  <SelectItem value="rolls">Rolls</SelectItem>
                  <SelectItem value="pairs">Pairs</SelectItem>
                  <SelectItem value="packets">Packets</SelectItem>
                  <SelectItem value="bottles">Bottles</SelectItem>
                  <SelectItem value="sets">Sets</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Opening Stock</Label>
              <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min Stock</Label>
              <Input type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// MANAGE DEPARTMENTS DIALOG
// ============================================

function ManageDepartmentsDialog({ departments, onDone }: { departments: DepartmentData[]; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState("")
  // Inline edit state: id → new name string (null = not editing)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  // Delete confirm state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return toast.error("Department name is required")
    startTransition(async () => {
      const result = await addDepartment(newName)
      if (result.success) {
        toast.success(result.message)
        setNewName("")
        onDone()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleRename = (id: string) => {
    if (!editName.trim()) return toast.error("Name cannot be empty")
    startTransition(async () => {
      const result = await updateDepartment(id, editName)
      if (result.success) {
        toast.success(result.message)
        setEditingId(null)
        onDone()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteDepartment(id)
      if (result.success) {
        toast.success(result.message)
        setDeletingId(null)
        onDone()
      } else {
        toast.error(result.message)
        setDeletingId(null)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Building2 className="h-4 w-4 mr-2" /> Departments
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manage Departments</DialogTitle>
          <DialogDescription>Organize inventory by department</DialogDescription>
        </DialogHeader>

        {/* Add new department */}
        <form onSubmit={handleAdd} className="flex gap-2 mt-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New department name..."
            className="text-sm"
          />
          <Button type="submit" size="sm" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        {/* Department list */}
        {departments.length > 0 && (
          <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
            {departments.map((d) => (
              <div key={d.id} className="bg-gray-50 rounded-md text-sm">
                {deletingId === d.id ? (
                  // ── Delete confirm row ──
                  <div className="px-3 py-2.5 space-y-2">
                    <p className="text-xs text-red-700 font-medium">
                      Delete &quot;{d.name}&quot;{d.itemCount > 0 ? ` (${d.itemCount} items — cannot delete)` : "?"}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs flex-1"
                        onClick={() => setDeletingId(null)}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                      {d.itemCount === 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs flex-1"
                          onClick={() => handleDelete(d.id)}
                          disabled={isPending}
                        >
                          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm Delete"}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : editingId === d.id ? (
                  // ── Inline edit row ──
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-xs flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleRename(d.id) }
                        if (e.key === "Escape") setEditingId(null)
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-7 w-7 p-0 bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => handleRename(d.id)}
                      disabled={isPending}
                      title="Save"
                    >
                      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="text-xs">✓</span>}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingId(null)}
                      title="Cancel"
                    >
                      <span className="text-xs">✕</span>
                    </Button>
                  </div>
                ) : (
                  // ── Normal row ──
                  <div className="flex items-center justify-between px-3 py-2">
                    <div>
                      <span className="font-medium">{d.name}</span>
                      <Badge variant="outline" className="text-[10px] ml-2">{d.itemCount} items</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        title="Rename"
                        onClick={() => { setEditingId(d.id); setEditName(d.name) }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                        onClick={() => setDeletingId(d.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// EDIT ITEM DIALOG (same form as Add Item)
// ============================================

function EditItemDialog({
  item,
  departments,
  onDone,
}: {
  item: GeneralItemData
  departments: DepartmentData[]
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(item.name)
  const [departmentId, setDepartmentId] = useState(item.departmentId)
  const [unit, setUnit] = useState(item.unit)
  const [minStock, setMinStock] = useState(String(item.minStock))
  const [stock, setStock] = useState(String(item.stock))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error("Item name is required")
    if (!departmentId) return toast.error("Select a department")

    startTransition(async () => {
      const result = await updateGeneralItem(item.id, {
        name,
        departmentId,
        unit,
        minStock: parseInt(minStock) || 5,
        stock: parseInt(stock) || 0,
      })
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        onDone()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="Edit item">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-blue-600" /> Edit Inventory Item
          </DialogTitle>
          <DialogDescription>Update item details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Item Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Surgical Gloves (Box)" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Department <span className="text-red-500">*</span></Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcs">Pieces</SelectItem>
                  <SelectItem value="boxes">Boxes</SelectItem>
                  <SelectItem value="liters">Liters</SelectItem>
                  <SelectItem value="kg">Kilograms</SelectItem>
                  <SelectItem value="rolls">Rolls</SelectItem>
                  <SelectItem value="pairs">Pairs</SelectItem>
                  <SelectItem value="packets">Packets</SelectItem>
                  <SelectItem value="bottles">Bottles</SelectItem>
                  <SelectItem value="sets">Sets</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Current Stock</Label>
              <Input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min Stock</Label>
              <Input type="number" min="0" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// DELETE ITEM BUTTON
// ============================================

function DeleteItemButton({
  item,
  onDone,
}: {
  item: GeneralItemData
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteGeneralItem(item.id)
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        onDone()
      } else {
        toast.error(result.message)
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete item">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" /> Delete Item?
          </DialogTitle>
          <DialogDescription>This will permanently remove the item from inventory.</DialogDescription>
        </DialogHeader>
        <div className="py-3">
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Item</span>
              <span className="font-semibold">{item.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Department</span>
              <span className="font-medium">{item.departmentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Stock</span>
              <span className="font-medium">{item.stock} {item.unit}</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

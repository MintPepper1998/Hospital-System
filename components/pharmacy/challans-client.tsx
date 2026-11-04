"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Pencil,
  ArrowRight,
  ClipboardList,
  PackageCheck,
  Clock,
  CheckCircle2,
} from "lucide-react"
import { deleteChallan, type ChallanListData } from "@/app/actions/challan"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

// ============================================
// NEOMORPHIC STYLE TOKENS
// ============================================

const neo = {
  card: "rounded-2xl bg-[#e0e5ec] border-none",
  shadow: "shadow-[6px_6px_12px_#bec3c9,-6px_-6px_12px_#ffffff]",
  shadowSm: "shadow-[3px_3px_6px_#bec3c9,-3px_-3px_6px_#ffffff]",
  inset: "shadow-[inset_3px_3px_6px_#bec3c9,inset_-3px_-3px_6px_#ffffff]",
  inputBg: "bg-[#e0e5ec]",
}

// ============================================
// COMPONENT
// ============================================

interface ChallansClientProps {
  initialChallans: ChallanListData[]
}

export function ChallansClient({ initialChallans }: ChallansClientProps) {
  const router = useRouter()
  const [challans] = useState<ChallanListData[]>(initialChallans)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Filtered data ──
  const filtered = useMemo(() => {
    return challans.filter((c) => {
      const matchesSearch =
        !search ||
        c.challanNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.supplierName.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [challans, search, statusFilter])

  // ── Stats ──
  const stats = useMemo(() => {
    const pending = challans.filter((c) => c.status === "PENDING").length
    const converted = challans.filter((c) => c.status === "CONVERTED").length
    return { total: challans.length, pending, converted }
  }, [challans])

  // ── Delete handler ──
  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const result = await deleteChallan(deleteId)
    setDeleting(false)
    setDeleteId(null)
    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${neo.card} ${neo.shadow} p-5 flex items-center gap-4`}>
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Challans</p>
            <p className="text-2xl font-extrabold text-slate-800">{stats.total}</p>
          </div>
        </div>
        <div className={`${neo.card} ${neo.shadow} p-5 flex items-center gap-4`}>
          <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
            <Clock className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-extrabold text-orange-600">{stats.pending}</p>
          </div>
        </div>
        <div className={`${neo.card} ${neo.shadow} p-5 flex items-center gap-4`}>
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Converted</p>
            <p className="text-2xl font-extrabold text-emerald-600">{stats.converted}</p>
          </div>
        </div>
      </div>

      {/* Filters + Create */}
      <div className={`${neo.card} ${neo.shadow} p-4 flex flex-col md:flex-row items-center gap-3`}>
        <div className={`relative flex-1 w-full`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by challan # or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`pl-10 ${neo.inset} border-none h-10`}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={`w-[160px] ${neo.inset} border-none h-10`}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
          </SelectContent>
        </Select>
        <Link href="/dashboard/pharmacy/challans/create">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white h-10 px-5 rounded-xl shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            New Challan
          </Button>
        </Link>
      </div>

      {/* Challans List */}
      {filtered.length === 0 ? (
        <div className={`${neo.card} ${neo.shadow} p-16 text-center`}>
          <PackageCheck className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">No challans found</p>
          <p className="text-sm text-slate-400 mt-1">Create your first challan to receive stock from suppliers</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((challan) => (
            <div
              key={challan.id}
              className={`${neo.card} ${neo.shadow} p-5 flex flex-col md:flex-row items-start md:items-center gap-4 transition-all hover:shadow-[8px_8px_16px_#bec3c9,-8px_-8px_16px_#ffffff]`}
            >
              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-slate-800 text-base">#{challan.challanNumber}</span>
                  <Badge
                    variant="outline"
                    className={
                      challan.status === "PENDING"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }
                  >
                    {challan.status === "PENDING" ? (
                      <><Clock className="h-3 w-3 mr-1" /> Pending</>
                    ) : (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Converted</>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>{challan.supplierName}</span>
                  <span className="text-slate-300">•</span>
                  <span>{format(new Date(challan.date), "dd MMM yyyy")}</span>
                  <span className="text-slate-300">•</span>
                  <span>{challan.itemCount} item{challan.itemCount !== 1 ? "s" : ""}</span>
                </div>
                {challan.convertedToInvoice && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    → Invoice #{challan.convertedToInvoice}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/dashboard/pharmacy/challans/${challan.id}`}>
                  <Button variant="outline" size="sm" className={`${neo.shadowSm} border-none rounded-xl`}>
                    <Eye className="h-4 w-4 mr-1.5" />
                    View
                  </Button>
                </Link>
                {challan.status === "PENDING" && (
                  <>
                    <Link href={`/dashboard/pharmacy/challans/${challan.id}/edit`}>
                      <Button variant="outline" size="sm" className={`${neo.shadowSm} border-none rounded-xl`}>
                        <Pencil className="h-4 w-4 mr-1.5" />
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/dashboard/pharmacy/challans/${challan.id}`}>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md">
                        <ArrowRight className="h-4 w-4 mr-1.5" />
                        Convert
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`${neo.shadowSm} border-none rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50`}
                      onClick={() => setDeleteId(challan.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Challan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the challan and reverse the inventory stock that was added.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

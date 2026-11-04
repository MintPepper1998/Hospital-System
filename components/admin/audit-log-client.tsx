"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Activity,
  Clock,
  CalendarDays,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Pencil,
  Trash2,
  Eye,
  LogIn,
  LogOut,
  Cog,
  AlertTriangle,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// ============================================
// TYPES
// ============================================

interface AuditUser {
  id: string
  name: string | null
  email: string
  role: string
}

interface AuditLogEntry {
  id: string
  action: string
  module: string
  recordId: string | null
  changes: Record<string, unknown> | null
  timestamp: string
  ipAddress: string | null
  user: AuditUser
}

interface UserOption {
  id: string
  name: string
  role: string
}

interface Props {
  logs: AuditLogEntry[]
  totalCount: number
  totalPages: number
  currentPage: number
  todayCount: number
  weekCount: number
  moduleOptions: string[]
  userOptions: UserOption[]
  filters: {
    action: string
    module: string
    user: string
    q: string
  }
}

// ============================================
// ACTION CONFIG
// ============================================

const ACTION_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  CREATE: {
    icon: Plus,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    label: "Created",
  },
  UPDATE: {
    icon: Pencil,
    color: "text-blue-600",
    bg: "bg-blue-100",
    label: "Updated",
  },
  DELETE: {
    icon: Trash2,
    color: "text-red-600",
    bg: "bg-red-100",
    label: "Deleted",
  },
  VIEW: {
    icon: Eye,
    color: "text-gray-600",
    bg: "bg-gray-100",
    label: "Viewed",
  },
  LOGIN: {
    icon: LogIn,
    color: "text-indigo-600",
    bg: "bg-indigo-100",
    label: "Login",
  },
  LOGOUT: {
    icon: LogOut,
    color: "text-amber-600",
    bg: "bg-amber-100",
    label: "Logout",
  },
  PROCESS: {
    icon: Cog,
    color: "text-purple-600",
    bg: "bg-purple-100",
    label: "Processed",
  },
}

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  DOCTOR: "bg-blue-100 text-blue-700",
  NURSE: "bg-pink-100 text-pink-700",
  PATIENT: "bg-green-100 text-green-700",
  RECEPTIONIST: "bg-amber-100 text-amber-700",
  PHARMACIST: "bg-teal-100 text-teal-700",
  LAB_TECHNICIAN: "bg-cyan-100 text-cyan-700",
  ACCOUNTANT: "bg-orange-100 text-orange-700",
}

const ALL_ACTIONS = [
  "ALL",
  "CREATE",
  "UPDATE",
  "DELETE",
  "VIEW",
  "LOGIN",
  "LOGOUT",
  "PROCESS",
]

function getInitials(name: string | null): string {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AuditLogClient({
  logs,
  totalCount,
  totalPages,
  currentPage,
  todayCount,
  weekCount,
  moduleOptions,
  userOptions,
  filters,
}: Props) {
  const router = useRouter()
  const [search, setSearch] = useState(filters.q)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function applyFilters(overrides?: Partial<typeof filters & { page: string }>) {
    const p = new URLSearchParams()
    const merged = { ...filters, ...overrides }
    if (merged.action && merged.action !== "ALL") p.set("action", merged.action)
    if (merged.module && merged.module !== "ALL") p.set("module", merged.module)
    if (merged.user && merged.user !== "ALL") p.set("user", merged.user)
    if (merged.q) p.set("q", merged.q)
    if (overrides?.page) p.set("page", overrides.page)
    router.push(`/dashboard/admin/audit-logs?${p.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    applyFilters({ q: search })
  }

  function clearFilters() {
    setSearch("")
    router.push("/dashboard/admin/audit-logs")
  }

  const hasActiveFilters =
    filters.action !== "ALL" ||
    filters.module !== "ALL" ||
    filters.user !== "ALL" ||
    filters.q !== ""

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Audit Logs
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Track every change made across the system with full user attribution
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Activity}
          label="Total Events"
          value={totalCount}
          color="indigo"
        />
        <StatCard
          icon={Clock}
          label="Today"
          value={todayCount}
          color="emerald"
        />
        <StatCard
          icon={CalendarDays}
          label="This Week"
          value={weekCount}
          color="blue"
        />
        <StatCard
          icon={BarChart3}
          label="Active Users"
          value={userOptions.length}
          color="purple"
        />
      </div>

      {/* Filters */}
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by module, record ID, user name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-white border-gray-200"
              />
            </form>

            {/* Action Filter */}
            <Select
              value={filters.action}
              onValueChange={(v) => applyFilters({ action: v })}
            >
              <SelectTrigger className="w-full lg:w-[160px] h-9">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                {ALL_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a === "ALL" ? "All Actions" : a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Module Filter */}
            <Select
              value={filters.module}
              onValueChange={(v) => applyFilters({ module: v })}
            >
              <SelectTrigger className="w-full lg:w-[180px] h-9">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Modules</SelectItem>
                {moduleOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* User Filter */}
            <Select
              value={filters.user}
              onValueChange={(v) => applyFilters({ user: v })}
            >
              <SelectTrigger className="w-full lg:w-[200px] h-9">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Users</SelectItem>
                {userOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.role.replace(/_/g, " ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-gray-500 gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card className="border border-gray-100 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FileText className="h-12 w-12 mx-auto opacity-30 mb-3" />
              <p className="font-medium text-gray-500">No audit logs found</p>
              <p className="text-xs mt-1">
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "System activity will appear here"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {logs.map((log) => {
                const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.VIEW
                const Icon = config.icon
                const isExpanded = expandedId === log.id
                const roleStyle =
                  ROLE_STYLES[log.user.role] || "bg-gray-100 text-gray-700"
                const timeAgo = formatDistanceToNow(new Date(log.timestamp), {
                  addSuffix: true,
                })
                const fullTime = format(
                  new Date(log.timestamp),
                  "MMM d, yyyy 'at' h:mm:ss a"
                )

                return (
                  <div
                    key={log.id}
                    className="group hover:bg-gray-50/60 transition-colors"
                  >
                    {/* Main Row */}
                    <div className="flex items-start gap-3 px-5 py-3.5">
                      {/* Action Icon */}
                      <div
                        className={`h-9 w-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
                      >
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            className={`${config.bg} ${config.color} border-0 text-[9px] font-bold px-1.5`}
                          >
                            {config.label}
                          </Badge>
                          <span className="text-sm font-semibold text-gray-900">
                            {log.module}
                          </span>
                          {log.recordId && (
                            <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {log.recordId.length > 16
                                ? `${log.recordId.slice(0, 8)}...`
                                : log.recordId}
                            </span>
                          )}
                        </div>

                        {/* Description line */}
                        <p className="text-xs text-gray-500 mt-0.5">
                          {buildDescription(log)}
                        </p>
                      </div>

                      {/* User + Time */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* User Avatar */}
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-sm">
                            <span className="text-[9px] font-bold text-white">
                              {getInitials(log.user.name)}
                            </span>
                          </div>
                          <div className="hidden md:block text-right">
                            <p className="text-xs font-semibold text-gray-700 truncate max-w-[120px]">
                              {log.user.name || "Unknown"}
                            </p>
                            <Badge
                              className={`${roleStyle} border-0 text-[8px] font-semibold px-1 py-0`}
                            >
                              {log.user.role.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="text-right min-w-[80px] hidden sm:block">
                          <p
                            className="text-[11px] text-gray-500 font-medium"
                            title={fullTime}
                          >
                            {timeAgo}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {format(new Date(log.timestamp), "h:mm a")}
                          </p>
                        </div>

                        {/* Expand button */}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : log.id)
                            }
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Changes Detail */}
                    {isExpanded && log.changes && (
                      <div className="px-5 pb-4 pl-[68px]">
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Change Details
                          </p>
                          <div className="space-y-1.5">
                            {Object.entries(log.changes).map(([key, value]) => (
                              <div
                                key={key}
                                className="flex items-start gap-3 text-xs"
                              >
                                <span className="text-gray-400 font-medium min-w-[100px] text-right">
                                  {formatKey(key)}:
                                </span>
                                <span className="text-gray-700 font-semibold break-all">
                                  {formatValue(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/30">
              <p className="text-xs text-gray-400">
                Page {currentPage} of {totalPages} &middot; {totalCount} total
                events
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() =>
                    applyFilters({ page: String(currentPage - 1) })
                  }
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = getPageNumber(i, currentPage, totalPages)
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => applyFilters({ page: String(page) })}
                      className={`h-7 w-7 p-0 text-xs ${
                        page === currentPage
                          ? "bg-indigo-600 text-white"
                          : ""
                      }`}
                    >
                      {page}
                    </Button>
                  )
                })}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    applyFilters({ page: String(currentPage + 1) })
                  }
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  const colorMap: Record<string, { bg: string; icon: string; gradient: string }> = {
    indigo: {
      bg: "bg-indigo-100",
      icon: "text-indigo-600",
      gradient: "from-indigo-50 to-white",
    },
    emerald: {
      bg: "bg-emerald-100",
      icon: "text-emerald-600",
      gradient: "from-emerald-50 to-white",
    },
    blue: {
      bg: "bg-blue-100",
      icon: "text-blue-600",
      gradient: "from-blue-50 to-white",
    },
    purple: {
      bg: "bg-purple-100",
      icon: "text-purple-600",
      gradient: "from-purple-50 to-white",
    },
  }

  const c = colorMap[color] || colorMap.indigo

  return (
    <Card className={`border-0 shadow-sm bg-gradient-to-br ${c.gradient}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-xl ${c.bg} flex items-center justify-center`}
          >
            <Icon className={`h-5 w-5 ${c.icon}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {value.toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-500 font-medium">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function buildDescription(log: AuditLogEntry): string {
  const userName = log.user.name || log.user.email
  const action = log.action.toLowerCase()
  const changes = log.changes

  // Try to extract meaningful context from changes
  let detail = ""
  if (changes) {
    if (changes.name) detail = ` "${changes.name}"`
    else if (changes.fullName) detail = ` "${changes.fullName}"`
    else if (changes.email) detail = ` (${changes.email})`
    else if (changes.billNumber) detail = ` ${changes.billNumber}`
    else if (changes.passwordReset) detail = " (password reset)"
    else if (changes.isActive !== undefined)
      detail = changes.isActive ? " (activated)" : " (deactivated)"
  }

  return `${userName} ${action}${action === "process" ? "ed" : action.endsWith("e") ? "d" : "ed"} ${log.module}${detail}`
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function getPageNumber(
  index: number,
  currentPage: number,
  totalPages: number
): number {
  if (totalPages <= 5) return index + 1

  let start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, start + 4)
  start = Math.max(1, end - 4)

  return start + index
}

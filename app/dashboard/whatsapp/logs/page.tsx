import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, CheckCircle2, XCircle, Clock, SkipForward, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface PageProps {
  searchParams: Promise<{
    page?: string
    category?: string
    status?: string
  }>
}

export default async function WhatsAppLogsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const currentPage = Number(params?.page) || 1
  const pageSize = 20
  const categoryFilter = params?.category || "ALL"
  const statusFilter = params?.status || "ALL"

  // Build filter
  const where: any = {}
  if (categoryFilter !== "ALL") where.category = categoryFilter
  if (statusFilter !== "ALL") where.status = statusFilter

  const [logs, totalCount] = await Promise.all([
    prisma.whatsAppLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.whatsAppLog.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / pageSize)

  // Stats
  const [sentCount, failedCount, skippedCount] = await Promise.all([
    prisma.whatsAppLog.count({ where: { status: "SENT" } }),
    prisma.whatsAppLog.count({ where: { status: "FAILED" } }),
    prisma.whatsAppLog.count({ where: { status: "SKIPPED" } }),
  ])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
      case "DELIVERED":
        return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" />{status}</Badge>
      case "FAILED":
        return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>
      case "SKIPPED":
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]"><SkipForward className="h-3 w-3 mr-1" />{status}</Badge>
      case "PENDING":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]"><Clock className="h-3 w-3 mr-1" />{status}</Badge>
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>
    }
  }

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      BOOKING: "bg-blue-100 text-blue-700 border-blue-200",
      BILLING: "bg-purple-100 text-purple-700 border-purple-200",
      LAB_RESULT: "bg-teal-100 text-teal-700 border-teal-200",
      REMINDER: "bg-orange-100 text-orange-700 border-orange-200",
    }
    return <Badge className={`${colors[category] || "bg-gray-100 text-gray-600"} text-[10px]`}>{category}</Badge>
  }

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams()
    const base = { page: "1", category: categoryFilter, status: statusFilter }
    const merged = { ...base, ...overrides }
    Object.entries(merged).forEach(([k, v]) => { if (v && v !== "ALL" && v !== "1") p.set(k, v) })
    const qs = p.toString()
    return `/dashboard/whatsapp/logs${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-green-600" />
          WhatsApp Message Logs
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track all WhatsApp notifications sent to patients — bookings, bills, and lab results.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCount}</p>
              <p className="text-xs text-muted-foreground">Total Messages</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{sentCount}</p>
              <p className="text-xs text-muted-foreground">Sent / Delivered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <SkipForward className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-500">{skippedCount}</p>
              <p className="text-xs text-muted-foreground">Skipped</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-muted-foreground mr-2">Category:</span>
            {["ALL", "BOOKING", "BILLING", "LAB_RESULT", "REMINDER"].map((cat) => (
              <Link key={cat} href={buildUrl({ category: cat, page: "1" })}>
                <Badge
                  variant={categoryFilter === cat ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                >
                  {cat === "ALL" ? "All" : cat.replace("_", " ")}
                </Badge>
              </Link>
            ))}

            <span className="text-xs font-semibold text-muted-foreground ml-4 mr-2">Status:</span>
            {["ALL", "SENT", "DELIVERED", "FAILED", "SKIPPED", "PENDING"].map((st) => (
              <Link key={st} href={buildUrl({ status: st, page: "1" })}>
                <Badge
                  variant={statusFilter === st ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                >
                  {st === "ALL" ? "All" : st}
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Message History</CardTitle>
          <CardDescription>
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount} messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No WhatsApp messages found</p>
              <p className="text-sm mt-1">Messages will appear here once WhatsApp notifications are enabled.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Time</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Phone</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Template</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Lang</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Category</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), "MMM dd, HH:mm")}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{log.phone}</td>
                      <td className="px-3 py-2.5 text-xs font-medium">{log.templateName}</td>
                      <td className="px-3 py-2.5 text-xs uppercase">{log.language}</td>
                      <td className="px-3 py-2.5">{getCategoryBadge(log.category)}</td>
                      <td className="px-3 py-2.5">{getStatusBadge(log.status)}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.errorMessage || log.messageId || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link href={buildUrl({ page: String(currentPage - 1) })}>
                    <Button variant="outline" size="sm">
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link href={buildUrl({ page: String(currentPage + 1) })}>
                    <Button variant="outline" size="sm">
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, User, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { format } from "date-fns"

interface QueueItem {
  id: string
  patientId: string
  patientName: string
  patientDisplayId: string
  patientPhone?: string | null
  label: string           // e.g. "Dr. Sahoo" or "Laceration repair"
  sublabel?: string       // e.g. "2 procedures • ₹1,500"
  time: string            // ISO date string
  status: string
  amount?: number
}

interface BillingQueueProps {
  title: string
  items: QueueItem[]
  selectedId?: string | null
  onSelect: (item: QueueItem) => void
  emptyMessage?: string
}

export function BillingQueue({
  title,
  items,
  selectedId,
  onSelect,
  emptyMessage = "No pending items",
}: BillingQueueProps) {
  const [search, setSearch] = useState("")

  const filtered = items.filter(
    (item) =>
      item.patientName.toLowerCase().includes(search.toLowerCase()) ||
      item.patientDisplayId.toLowerCase().includes(search.toLowerCase()) ||
      item.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Card className="border-gray-200 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-800">
            {title}
          </CardTitle>
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-700 font-medium text-xs"
          >
            {items.length}
          </Badge>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <ScrollArea className="h-[calc(100vh-380px)] min-h-[300px]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Clock className="h-8 w-8 mb-2" />
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedId === item.id
                      ? "border-blue-400 bg-blue-50 shadow-sm"
                      : "border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        selectedId === item.id
                          ? "bg-blue-100"
                          : "bg-gray-100"
                      }`}
                    >
                      <User
                        className={`h-3.5 w-3.5 ${
                          selectedId === item.id
                            ? "text-blue-600"
                            : "text-gray-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.patientName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.patientDisplayId} •{" "}
                        {format(new Date(item.time), "hh:mm a")}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">
                        {item.label}
                      </p>
                      {item.sublabel && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">
                          {item.sublabel}
                        </p>
                      )}
                    </div>
                    {item.amount !== undefined && item.amount > 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-green-200 text-green-700 flex-shrink-0"
                      >
                        ₹{item.amount.toLocaleString("en-IN")}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

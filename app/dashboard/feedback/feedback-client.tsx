"use client"

import { useState } from "react"
import { format } from "date-fns"
import { updateFeedbackStatus } from "@/lib/actions/feedback"
import { FeedbackStatus, FeedbackType } from "@prisma/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export function FeedbackClient({ initialFeedbacks }: { initialFeedbacks: any[] }) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks)
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null)
  const [resolveNote, setResolveNote] = useState("")
  const [status, setStatus] = useState<FeedbackStatus>("OPEN")
  const [isUpdating, setIsUpdating] = useState(false)

  // Filters
  const [filterType, setFilterType] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [search, setSearch] = useState("")

  const handleUpdate = async () => {
    if (!selectedFeedback) return
    setIsUpdating(true)
    try {
      const updated = await updateFeedbackStatus(selectedFeedback.id, status, resolveNote)
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === updated.id ? { ...f, ...updated } : f))
      )
      setSelectedFeedback(null)
    } catch (err) {
      console.error(err)
      alert("Failed to update feedback status")
    } finally {
      setIsUpdating(false)
    }
  }

  const filteredFeedbacks = feedbacks.filter((f) => {
    const matchesType = filterType === "ALL" || f.type === filterType
    const matchesStatus = filterStatus === "ALL" || f.status === filterStatus
    const searchLower = search.toLowerCase()
    const matchesSearch = 
      f.subject.toLowerCase().includes(searchLower) ||
      f.patient?.user?.name?.toLowerCase().includes(searchLower) ||
      f.patient?.patientId?.toLowerCase().includes(searchLower)

    return matchesType && matchesStatus && matchesSearch
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <Input 
          placeholder="Search by subject, patient name or ID..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="SUGGESTION">Suggestion</SelectItem>
            <SelectItem value="COMPLAINT">Complaint</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFeedbacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No feedback found matching the criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredFeedbacks.map((feedback) => (
                <TableRow key={feedback.id}>
                  <TableCell className="whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(feedback.createdAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={feedback.type === "COMPLAINT" ? "destructive" : "default"}>
                      {feedback.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{feedback.patient?.user?.name}</div>
                    <div className="text-xs text-gray-500">{feedback.patient?.patientId}</div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate font-medium">
                    {feedback.subject}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={
                        feedback.status === "RESOLVED" ? "bg-green-50 text-green-700 border-green-200" :
                        feedback.status === "IN_PROGRESS" ? "bg-orange-50 text-orange-700 border-orange-200" :
                        "bg-gray-50 text-gray-700"
                      }
                    >
                      {feedback.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setSelectedFeedback(feedback)
                        setStatus(feedback.status)
                        setResolveNote(feedback.resolveNote || "")
                      }}
                    >
                      View / Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Feedback Details
              <Badge variant={selectedFeedback?.type === "COMPLAINT" ? "destructive" : "default"}>
                {selectedFeedback?.type}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedFeedback && (
            <div className="space-y-4 py-2">
              <div>
                <h4 className="text-sm font-semibold text-gray-500">From Patient</h4>
                <p className="font-medium">{selectedFeedback.patient?.user?.name} ({selectedFeedback.patient?.patientId})</p>
                <p className="text-sm text-gray-500">{selectedFeedback.patient?.phone}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500">Subject</h4>
                <p className="font-medium">{selectedFeedback.subject}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-500 mb-1">Message</h4>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-800 whitespace-pre-wrap border border-gray-100 max-h-48 overflow-y-auto">
                  {selectedFeedback.message}
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">New Status</label>
                    <Select value={status} onValueChange={(val: FeedbackStatus) => setStatus(val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Staff Note (Visible to Patient)</label>
                    <Textarea 
                      placeholder="Add a resolution note or response..." 
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedFeedback(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

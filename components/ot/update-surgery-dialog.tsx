"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Settings, AlertCircle, FileText, Stethoscope, ClipboardList, Printer, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { updateSurgeryStatus, updatePACStatus } from "@/lib/actions"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { UploadOTDocumentDialog } from "@/components/ot/upload-ot-document-dialog"
import { UploadOTMediaDialog } from "@/components/ot/upload-ot-media-dialog"
import { OTConsumablesTab } from "./ot-consumables-tab"

export function UpdateSurgeryDialog({ 
  surgery, 
  buttonLabel = "Manage" 
}: { 
  surgery: any;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<"status" | "pac" | "print" | "media" | "clinical" | "consumables">("status")
  const [clinicalData, setClinicalData] = useState<{ prescriptions: any[], labRequests: any[] } | null>(null)
  const [isLoadingClinical, setIsLoadingClinical] = useState(false)

  // Fetch clinical data when tab is switched
  const fetchClinicalData = async () => {
    if (clinicalData || isLoadingClinical) return
    setIsLoadingClinical(true)
    try {
      const { getSurgeryClinicalDetails } = await import("@/app/actions/ot")
      const result = await getSurgeryClinicalDetails(surgery.patientId)
      if (result.success) {
        setClinicalData(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch clinical data", error)
    } finally {
      setIsLoadingClinical(false)
    }
  }

  const handleTabChange = (tab: any) => {
    setActiveTab(tab)
    if (tab === "clinical") {
      fetchClinicalData()
    }
  }

  const handleStatusUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("surgeryId", surgery.id)

    startTransition(async () => {
      try {
        const result = await updateSurgeryStatus(formData)
        
        if (result.success) {
          toast.success(result.message || "Status updated successfully")
          setOpen(false)
        } else {
          toast.error(result.message || "Failed to update status")
          
          // Special handling for PAC warnings
          if (result.pacStatus === 'UNFIT') {
            toast.error("⚠️ Cannot proceed: Patient is UNFIT for surgery", {
              duration: 5000
            })
          }
        }
      } catch (error: any) {
        toast.error(error.message || "An error occurred")
      }
    })
  }

  const handlePACUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("surgeryId", surgery.id)

    startTransition(async () => {
      try {
        const result = await updatePACStatus(formData)
        
        if (result.success) {
          toast.success(result.message || "PAC status updated successfully")
          setOpen(false)
        } else {
          toast.error(result.message || "Failed to update PAC status")
        }
      } catch (error: any) {
        toast.error(error.message || "An error occurred")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{buttonLabel} — {surgery.procedureName}</DialogTitle>
          <DialogDescription className="sr-only">
            Update surgery procedures, status, media, clinical records, and billing.
          </DialogDescription>
          
          <div className="space-y-1 pt-1 mt-2">
            <div className="flex justify-between items-center text-foreground font-medium">
              <span>Patient: {surgery.patient?.user?.name}</span>
              <Badge variant="outline">{surgery.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
              <div>Surgeon: {surgery.leadSurgeon?.user?.name || "No surgeon assigned"}</div>
              <div>Theater: {surgery.theater?.name || "No theater assigned"}</div>
              <div>Date: {new Date(surgery.scheduledDate).toLocaleDateString()}</div>
              <div>Time: {new Date(surgery.scheduledDate).toLocaleTimeString()}</div>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Selector */}
        <div className="flex border-b overflow-x-auto whitespace-nowrap pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("status")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "status"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Surgery Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pac")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "pac"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            PAC Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("print")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "print"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Print Forms
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("media")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "media"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Media
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("clinical")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "clinical"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Clinical
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("consumables")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "consumables"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Consumables & Bill
          </button>
        </div>

        {/* Status Update Form */}
        {activeTab === "status" && (
          <form onSubmit={handleStatusUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <Badge>{surgery.status}</Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">New Status *</Label>
              <Select name="status" defaultValue={surgery.status} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="POSTPONED">Postponed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PAC Warning */}
            {surgery.pacStatus === 'UNFIT' && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">
                  <p className="font-semibold">⚠️ PAC Status: UNFIT</p>
                  <p>This surgery cannot be started. Patient is marked unfit for anesthesia.</p>
                </div>
              </div>
            )}

            {surgery.pacStatus === 'PENDING' && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-semibold">PAC Check Pending</p>
                  <p>Pre-anesthesia evaluation has not been completed.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="findings">Findings</Label>
                <Textarea
                  id="findings"
                  name="findings"
                  placeholder="Intra-operative findings..."
                  rows={2}
                  defaultValue={surgery.findings || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complications">Complications</Label>
                <Textarea
                  id="complications"
                  name="complications"
                  placeholder="Any complications..."
                  rows={2}
                  defaultValue={surgery.complications || ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Status Update Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Add any notes about this status change..."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </form>
        )}

        {/* Print Forms */}
        {activeTab === "print" && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Open pre-filled OT forms for printing. Each form opens in a new tab.
            </p>
            <div className="space-y-2">
              <Link
                href={`/dashboard/clinical/ot/print/${surgery.id}?type=consent`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <FileText className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Patient Consent Form</p>
                  <p className="text-xs text-muted-foreground">Informed consent with all 8 clauses</p>
                </div>
                {surgery.consentFormUrl ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Printer className="h-4 w-4 text-muted-foreground" />
                )}
              </Link>
              <Link
                href={`/dashboard/clinical/ot/print/${surgery.id}?type=anaesthesia`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <Stethoscope className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Anaesthesia Record</p>
                  <p className="text-xs text-muted-foreground">Pre-op vitals, drugs, monitoring chart</p>
                </div>
                {surgery.anaesthesiaRecordUrl ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Printer className="h-4 w-4 text-muted-foreground" />
                )}
              </Link>
              <Link
                href={`/dashboard/clinical/ot/print/${surgery.id}?type=op_note`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <ClipboardList className="h-5 w-5 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Operation Note</p>
                  <p className="text-xs text-muted-foreground">Surgeon&apos;s operative record with findings</p>
                </div>
                {surgery.operationNoteUrl ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Printer className="h-4 w-4 text-muted-foreground" />
                )}
              </Link>
            </div>

            {/* Upload Signed Scans */}
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Upload Signed Scans</p>
              <UploadOTDocumentDialog
                surgeryId={surgery.id}
                procedureName={surgery.procedureName}
                docStatus={{
                  consent: !!surgery.consentFormUrl,
                  anaesthesia: !!surgery.anaesthesiaRecordUrl,
                  op_note: !!surgery.operationNoteUrl,
                  consentFormUrl: surgery.consentFormUrl,
                  anaesthesiaRecordUrl: surgery.anaesthesiaRecordUrl,
                  operationNoteUrl: surgery.operationNoteUrl,
                }}
              />
            </div>
          </div>
        )}

        {/* Media Upload Form */}
        {activeTab === "media" && (
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-4">
              Upload up to 5 images and 1 short video for the operation log.
            </p>
            <UploadOTMediaDialog 
              surgeryId={surgery.id}
              procedureName={surgery.procedureName}
            />
          </div>
        )}

        {/* PAC Status Update Form */}
        {activeTab === "pac" && (
          <form onSubmit={handlePACUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>Current PAC Status</Label>
              <Badge>{surgery.pacStatus}</Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pacStatus">New PAC Status *</Label>
              <Select name="pacStatus" defaultValue={surgery.pacStatus} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending Evaluation</SelectItem>
                  <SelectItem value="FIT">Fit for Surgery</SelectItem>
                  <SelectItem value="CONDITIONAL">Conditional (with precautions)</SelectItem>
                  <SelectItem value="UNFIT">Unfit for Surgery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pacNotes">PAC Notes *</Label>
              <Textarea
                id="pacNotes"
                name="pacNotes"
                placeholder="Enter pre-anesthesia check findings..."
                rows={4}
                defaultValue={surgery.pacNotes || ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pacCheckedBy">Checked By (Name)</Label>
              <input
                id="pacCheckedBy"
                name="pacCheckedBy"
                type="text"
                placeholder="Anesthetist name"
                className="w-full p-2 border rounded"
                defaultValue={surgery.pacCheckedBy || ""}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Updating..." : "Update PAC Status"}
              </Button>
            </div>
          </form>
        )}

        {/* Clinical Info Tab */}
        {activeTab === "clinical" && (
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <h4 className="text-sm font-semibold mb-2">Medications during Admission</h4>
              {isLoadingClinical ? (
                <p className="text-xs text-muted-foreground">Loading prescriptions...</p>
              ) : clinicalData?.prescriptions && clinicalData.prescriptions.length > 0 ? (
                <div className="space-y-2">
                  {clinicalData.prescriptions.map((p: any) => (
                    <div key={p.id} className="text-xs p-2 rounded border bg-muted/30">
                      <p className="font-medium">{p.medicineName} ({p.dosage})</p>
                      <p className="text-muted-foreground">{p.frequency} - {p.duration}</p>
                      {p.instruction && <p className="italic text-[10px]">{p.instruction}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No prescriptions found for this patient.</p>
              )}
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-semibold mb-2">Lab & Radiology Tests</h4>
              {isLoadingClinical ? (
                <p className="text-xs text-muted-foreground">Loading tests...</p>
              ) : clinicalData?.labRequests && clinicalData.labRequests.length > 0 ? (
                <div className="space-y-2">
                  {clinicalData.labRequests.map((r: any) => (
                    <div key={r.id} className="text-xs p-2 rounded border bg-muted/30">
                      <p className="font-medium">{r.testName}</p>
                      <div className="flex justify-between items-center mt-1">
                        <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No lab requests found for this patient.</p>
              )}
            </div>
          </div>
        )}

        {/* Consumables Tab */}
        {activeTab === "consumables" && (
          <OTConsumablesTab surgery={surgery} />
        )}
      </DialogContent>
    </Dialog>
  )
}

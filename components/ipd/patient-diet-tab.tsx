"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { format } from "date-fns"
import { UtensilsCrossed, Plus, Clock, StopCircle, Info, FileText } from "lucide-react"
import { assignPatientDiet, stopPatientDiet } from "@/lib/canteen-actions"

interface DietPlan {
  id: string
  name: string
  code: string
  description: string | null
}

interface CanteenDiet {
  id: string
  dietPlanId: string
  assignedByName: string | null
  startDate: string
  endDate: string | null
  customNotes: string | null
  isActive: boolean
  dietPlan?: DietPlan
}

interface PatientDietTabProps {
  admissionId?: string
  emergencyVisitId?: string
  admissionStatus: string
  doctorName: string
  dietPlans: DietPlan[]
  canteenDiets: CanteenDiet[]
}

export function PatientDietTab({
  admissionId,
  emergencyVisitId,
  admissionStatus,
  doctorName,
  dietPlans,
  canteenDiets,
}: PatientDietTabProps) {
  const [isPending, startTransition] = useTransition()
  
  // Form State
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [customNotes, setCustomNotes] = useState("")

  const activeDiet = canteenDiets.find(d => d.isActive)
  const historyDiets = canteenDiets.filter(d => !d.isActive)

  const handleAssignDiet = () => {
    if (!selectedPlanId) {
      toast.error("Please select a diet plan")
      return
    }

    startTransition(async () => {
      const result = await assignPatientDiet({
        admissionId,
        emergencyVisitId,
        dietPlanId: selectedPlanId,
        assignedById: "current-user",
        assignedByName: doctorName,
        customNotes: customNotes.trim() || undefined,
      })

      if (result.success) {
        toast.success("Diet plan assigned successfully")
        setSelectedPlanId("")
        setCustomNotes("")
      } else {
        toast.error(result.error || "Failed to assign diet plan")
      }
    })
  }

  const handleStopDiet = (dietId: string) => {
    if (!confirm("Are you sure you want to stop this diet plan?")) return

    startTransition(async () => {
      const result = await stopPatientDiet(dietId, admissionId, emergencyVisitId)
      if (result.success) {
        toast.success("Diet plan stopped")
      } else {
        toast.error(result.error || "Failed to stop diet plan")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Assign New Diet Form */}
      {admissionStatus !== "DISCHARGED" && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              Assign Diet Plan
            </CardTitle>
            <CardDescription>Select a standard diet plan for the patient</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2">
                <Label>Diet Plan <span className="text-red-500">*</span></Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select diet plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dietPlans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} {plan.code ? `(${plan.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPlanId && dietPlans.find(p => p.id === selectedPlanId)?.description && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    {dietPlans.find(p => p.id === selectedPlanId)?.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Custom Notes (Optional)</Label>
                <Input 
                  placeholder="e.g. No salt, Soft diet only, Allergy to nuts..." 
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={handleAssignDiet} 
                disabled={isPending || !selectedPlanId}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isPending ? "Assigning..." : "Assign Diet"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Diet */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-orange-500" />
            Current Active Diet
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeDiet ? (
            <div className="bg-white border rounded-lg p-4 relative">
              <Badge className="absolute top-4 right-4 bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                Active
              </Badge>
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                {activeDiet.dietPlan?.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1 mb-3">
                Assigned by {activeDiet.assignedByName || "Staff"} on {format(new Date(activeDiet.startDate), "dd MMM yyyy, hh:mm a")}
              </p>
              
              {activeDiet.customNotes && (
                <div className="bg-orange-50 text-orange-800 p-3 rounded-md text-sm mb-4 border border-orange-100">
                  <span className="font-semibold block mb-1">Special Instructions:</span>
                  {activeDiet.customNotes}
                </div>
              )}

              {admissionStatus === "ADMITTED" && (
                <div className="flex justify-end pt-2 border-t border-gray-100 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleStopDiet(activeDiet.id)}
                    disabled={isPending}
                  >
                    <StopCircle className="h-4 w-4 mr-2" /> Stop Diet Plan
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
              <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No active diet plan assigned to this patient.</p>
              {admissionStatus === "ADMITTED" && (
                <p className="text-sm mt-1">Use the form above to assign one.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Diets */}
      {historyDiets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Diet History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historyDiets.map((diet) => (
                <div key={diet.id} className="border-l-2 border-gray-200 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-700">{diet.dietPlan?.name}</h4>
                    <span className="text-xs text-gray-500">
                      {format(new Date(diet.startDate), "dd MMM yy")} - {diet.endDate ? format(new Date(diet.endDate), "dd MMM yy") : "Now"}
                    </span>
                  </div>
                  {diet.customNotes && (
                    <p className="text-xs text-gray-600 mt-1 italic whitespace-pre-wrap">
                      Notes: {diet.customNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

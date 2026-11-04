"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Save,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
  Printer,
  Microscope,
  Radiation,
} from "lucide-react"
import { toast } from "sonner"
import { saveLabResult } from "@/lib/actions/lab"
import Link from "next/link"

interface CatalogParameter {
  name: string
  unit: string
  normalRange: string
}

interface LabResultEntryFormProps {
  requestId: string
  testName: string
  testType: "PATHOLOGY" | "RADIOLOGY"
  isCompleted: boolean
  existingContent: string
  existingImpression: string
  isIPD?: boolean
  catalogParameters?: CatalogParameter[] | null
  existingParameterResults?: Record<string, string> | null
}

const radiologyTemplates = {
  normal: "FINDINGS:\nNo significant abnormality detected.\n\nOBSERVATION:\n- Study appears within normal limits\n- No focal lesion identified\n- No evidence of acute pathology",
  xrayChest: "FINDINGS:\nBoth lung fields are clear.\nCardiac silhouette is normal in size and shape.\nCostophrenic angles are clear.\nBony thorax appears normal.\nMediastinum is central.\nNo pleural effusion or pneumothorax.",
  ultrasound: "FINDINGS:\nLIVER: Normal in size, shape and echotexture. No focal lesion.\nGALLBLADDER: Normal. No calculus seen.\nCBD: Not dilated.\nPANCREAS: Normal.\nSPLEEN: Normal.\nKIDNEYS: Both kidneys are normal in size, shape and echotexture. No calculus or hydronephrosis.\nURINARY BLADDER: Normal.",
}

const pathologyTemplates = {
  normal: "All parameters within normal reference range.",
  cbcNormal: "Haemoglobin: Normal\nTotal WBC Count: Within normal limits\nDifferential Count: Normal distribution\nPlatelet Count: Adequate\nRBC Indices: Normal\n\nPeripheral Smear: Normocytic normochromic RBCs. WBCs show normal morphology. Platelets adequate.",
}

export function LabResultEntryForm({
  requestId,
  testName,
  testType,
  isCompleted,
  existingContent,
  existingImpression,
  isIPD = false,
  catalogParameters,
  existingParameterResults,
}: LabResultEntryFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [reportContent, setReportContent] = useState(existingContent)
  const [impression, setImpression] = useState(existingImpression)

  const hasParameters = catalogParameters && catalogParameters.length > 0

  const [paramResults, setParamResults] = useState<Record<string, string>>(() => {
    if (existingParameterResults) return { ...existingParameterResults }
    if (!hasParameters) return {}
    const init: Record<string, string> = {}
    catalogParameters!.forEach(p => { init[p.name] = "" })
    return init
  })

  const isRadiology = testType === "RADIOLOGY"
  const colorClass = isRadiology ? "text-purple-600" : "text-blue-600"
  const templates = isRadiology ? radiologyTemplates : pathologyTemplates

  const updateParamResult = (paramName: string, value: string) => {
    setParamResults(prev => ({ ...prev, [paramName]: value }))
  }

  const handleSave = () => {
    if (hasParameters) {
      const filledCount = Object.values(paramResults).filter(v => v.trim()).length
      if (filledCount === 0) {
        toast.error("Please enter at least one parameter value")
        return
      }
    } else {
      if (!reportContent.trim()) {
        toast.error("Please enter the findings/report content")
        return
      }
    }

    startTransition(async () => {
      const payload: Parameters<typeof saveLabResult>[0] = {
        requestId,
        reportContent: hasParameters ? buildReportFromParams() : reportContent,
        impression,
        isIPD,
      }

      if (hasParameters) {
        payload.parameterResults = paramResults
      }

      const result = await saveLabResult(payload)

      if (result.success) {
        toast.success("Result saved successfully!")
        router.push(`/dashboard/lab/print/${requestId}`)
      } else {
        toast.error(result.message || "Failed to save result")
      }
    })
  }

  const buildReportFromParams = (): string => {
    if (!hasParameters) return reportContent
    return catalogParameters!
      .map(p => {
        const val = paramResults[p.name] || "-"
        const unit = p.unit ? ` ${p.unit}` : ""
        const range = p.normalRange ? `  (Normal: ${p.normalRange})` : ""
        return `${p.name}: ${val}${unit}${range}`
      })
      .join("\n")
  }

  const applyTemplate = (template: string) => {
    setReportContent(template)
  }

  const isFormValid = hasParameters
    ? Object.values(paramResults).some(v => v.trim())
    : reportContent.trim().length > 0

  if (isCompleted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Result Already Entered
          </CardTitle>
          <CardDescription>
            This test has already been completed. You can view or print the report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {/* Show structured parameter results if they exist */}
            {existingParameterResults && catalogParameters && catalogParameters.length > 0 ? (
              <div>
                <Label className="text-green-700">Parameter Results</Label>
                <div className="mt-2 rounded-md border border-green-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-green-100/50">
                        <th className="text-left px-3 py-2 font-semibold text-green-800">Parameter</th>
                        <th className="text-left px-3 py-2 font-semibold text-green-800">Result</th>
                        <th className="text-left px-3 py-2 font-semibold text-green-800">Unit</th>
                        <th className="text-left px-3 py-2 font-semibold text-green-800">Normal Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogParameters.map((param, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-green-50/30"}>
                          <td className="px-3 py-2 font-medium">{param.name}</td>
                          <td className="px-3 py-2 font-semibold">{existingParameterResults[param.name] || "-"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{param.unit || "-"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{param.normalRange || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-green-700">Findings</Label>
                <div className="mt-1 p-3 bg-white rounded-md border whitespace-pre-wrap text-sm">
                  {existingContent || "No content"}
                </div>
              </div>
            )}
            {existingImpression && (
              <div>
                <Label className="text-green-700">Impression</Label>
                <div className="mt-1 p-3 bg-white rounded-md border whitespace-pre-wrap text-sm">
                  {existingImpression}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <Link href={`/dashboard/lab/print/${requestId}`}>
                <Printer className="mr-2 h-4 w-4" />
                View / Print Report
              </Link>
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${colorClass}`}>
          <FileText className="h-5 w-5" />
          Enter {isRadiology ? "Radiology Findings" : "Pathology Results"}
        </CardTitle>
        <CardDescription>
          {hasParameters
            ? `Enter values for each parameter. ${catalogParameters!.length} parameters defined.`
            : "Enter the test findings and impression. This will finalize the report."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasParameters ? (
          /* ======== Structured Parameter Entry ======== */
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Microscope className="h-4 w-4 text-blue-600" />
              Test Parameters <span className="text-red-500">*</span>
            </Label>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="text-left px-4 py-2.5 font-semibold w-[30%]">Parameter</th>
                    <th className="text-left px-4 py-2.5 font-semibold w-[30%]">Result Value</th>
                    <th className="text-left px-4 py-2.5 font-semibold w-[15%]">Unit</th>
                    <th className="text-left px-4 py-2.5 font-semibold w-[25%]">Normal Range</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogParameters!.map((param, i) => (
                    <tr
                      key={i}
                      className={`border-t ${i % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                    >
                      <td className="px-4 py-2.5 font-medium text-gray-900">{param.name}</td>
                      <td className="px-4 py-2">
                        <Input
                          value={paramResults[param.name] || ""}
                          onChange={(e) => updateParamResult(param.name, e.target.value)}
                          placeholder="Enter value"
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{param.unit || "-"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{param.normalRange || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ======== Free-text Fallback ======== */
          <>
            {/* Quick Templates */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase">Quick Templates</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(templates).map(([key, value]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => applyTemplate(value)}
                  >
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                  </Button>
                ))}
              </div>
            </div>

            {/* Findings/Report Content */}
            <div className="space-y-2">
              <Label htmlFor="reportContent" className="flex items-center gap-2">
                {isRadiology ? (
                  <>
                    <Radiation className="h-4 w-4 text-purple-600" />
                    Findings <span className="text-red-500">*</span>
                  </>
                ) : (
                  <>
                    <Microscope className="h-4 w-4 text-blue-600" />
                    Results / Observations <span className="text-red-500">*</span>
                  </>
                )}
              </Label>
              <Textarea
                id="reportContent"
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                placeholder={
                  isRadiology
                    ? "Enter radiological findings, observations, measurements..."
                    : "Enter test values, observations, peripheral smear findings..."
                }
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use clear formatting. This will appear on the printed report.
              </p>
            </div>
          </>
        )}

        {/* Impression */}
        <div className="space-y-2">
          <Label htmlFor="impression" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Impression / Conclusion
          </Label>
          <Textarea
            id="impression"
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            placeholder={
              isRadiology
                ? "e.g., Normal study / No significant abnormality / Findings suggestive of..."
                : "e.g., Within normal limits / Suggestive of... / Correlate clinically"
            }
            rows={3}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Final diagnosis or conclusion. This is highlighted on the report.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancel
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className={isRadiology ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"}
                disabled={isPending || !isFormValid}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save & Finalize
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Finalize Report?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the test as <strong>COMPLETED</strong> and generate the final report. 
                  The report will be available for printing and viewing.
                  <br /><br />
                  <strong>Note:</strong> Once finalized, the result cannot be easily modified.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Review Again</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSave}
                  className={isRadiology ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"}
                >
                  Yes, Finalize Report
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}

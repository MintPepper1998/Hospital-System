"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Search, Eye } from "lucide-react"
import { LabTestDialog } from "./lab-test-dialog"
import { LabTestPreviewDialog } from "./lab-test-preview-dialog"
import { deleteLabTest } from "@/lib/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

type TestType = "PATHOLOGY" | "RADIOLOGY"

interface LabTest {
  id: string
  name: string
  code: string
  price: number
  category: string | null
  normalRange: string | null
  unit: string | null
  description: string | null
  isActive: boolean
  type?: TestType
  parameters?: unknown | null
  createdAt: Date
  updatedAt: Date
}

interface HospitalInfo {
  name: string
  address: string
  phone: string
  email: string
}

interface LabTestTableProps {
  initialTests: LabTest[]
  testType?: TestType
  hospital?: HospitalInfo | null
}

/** Count total parameters from either legacy or new format */
function countParams(params: unknown): number {
  if (!params) return 0
  const obj = params as Record<string, unknown>
  if (obj.sections && Array.isArray(obj.sections)) {
    return (obj.sections as Array<Record<string, unknown>>).reduce(
      (sum: number, s) => sum + (Array.isArray(s.parameters) ? s.parameters.length : 0),
      0
    )
  }
  if (Array.isArray(params)) return params.length
  return 0
}

/** Count sections from new format */
function countSections(params: unknown): number {
  if (!params) return 0
  const obj = params as Record<string, unknown>
  if (obj.sections && Array.isArray(obj.sections)) return obj.sections.length
  if (Array.isArray(params) && params.length > 0) return 1
  return 0
}

export function LabTestTable({ initialTests, testType = "PATHOLOGY", hospital }: LabTestTableProps) {
  const tests = initialTests
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300)
  const [editingTest, setEditingTest] = useState<LabTest | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [previewTest, setPreviewTest] = useState<LabTest | null>(null)
  const router = useRouter()

  const filteredTests = tests.filter(test =>
    test.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    test.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    test.category?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  )

  const handleDelete = async (test: LabTest) => {
    if (!confirm(`Are you sure you want to delete "${test.name}"? This action cannot be undone.`)) return
    const result = await deleteLabTest(test.id)
    if (result.success) {
      toast.success("Test deleted successfully")
      router.refresh()
    } else {
      toast.error(result.message || "Failed to delete test")
    }
  }

  const handleEdit = (test: LabTest) => {
    setEditingTest(test)
    setShowDialog(true)
  }

  const handleAddNew = () => {
    setEditingTest(null)
    setShowDialog(true)
  }

  const handlePreview = (test: LabTest) => {
    setPreviewTest(test)
  }

  return (
    <div className="space-y-4">
      {/* Search and Add */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by test name, code, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleAddNew}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Test
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[25%]">Test Name</TableHead>
              <TableHead className="w-[10%]">Code</TableHead>
              <TableHead className="w-[12%]">Category</TableHead>
              <TableHead className="w-[10%] text-right">Price (₹)</TableHead>
              <TableHead className="w-[15%]">Parameters</TableHead>
              <TableHead className="w-[10%] text-center">Status</TableHead>
              <TableHead className="w-[18%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No tests found matching &quot;{searchTerm}&quot;
                </TableCell>
              </TableRow>
            ) : (
              filteredTests.map((test) => {
                const paramCount = countParams(test.parameters)
                const sectionCount = countSections(test.parameters)
                return (
                  <TableRow key={test.id}>
                    <TableCell>
                      <p className="font-medium">{test.name}</p>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{test.code}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{test.category || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{test.price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {paramCount > 0 ? (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {paramCount} params
                          </Badge>
                          {sectionCount > 1 && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                              {sectionCount} sections
                            </Badge>
                          )}
                        </div>
                      ) : test.normalRange ? (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {test.normalRange}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Free-text</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {test.isActive ? (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {/* View / Preview */}
                        <Button
                          onClick={() => handlePreview(test)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Preview Report"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* Edit */}
                        <Button
                          onClick={() => handleEdit(test)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {/* Delete */}
                        <Button
                          onClick={() => handleDelete(test)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <LabTestDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        test={editingTest}
        testType={testType}
      />

      {/* Preview Dialog */}
      {previewTest && (
        <LabTestPreviewDialog
          open={!!previewTest}
          onOpenChange={(open) => { if (!open) setPreviewTest(null) }}
          test={previewTest}
          testType={testType}
          hospital={hospital}
        />
      )}
    </div>
  )
}

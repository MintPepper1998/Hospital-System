"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FlaskConical, Search, Plus, X, Microscope, Radiation } from "lucide-react"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

// Test Type matching Prisma enum
type TestType = "PATHOLOGY" | "RADIOLOGY"

// Lab Test interface matching LabTestCatalog
interface LabTest {
  id: string
  name: string
  code: string
  price: number
  category: string | null
  type: TestType
}

interface LabTestSelectorProps {
  labTests?: LabTest[] // Available tests from server (e.g. from LabTestCatalog)
  selectedTests?: LabTest[]
  onTestsChange?: (tests: LabTest[]) => void
  availableTests?: LabTest[]
  filterType?: TestType // Filter to show only this type
  title?: string
  icon?: "pathology" | "radiology"
}

// Default PATHOLOGY tests
const DEFAULT_PATHOLOGY_TESTS: LabTest[] = [
  { id: "default-1", name: "CBC (Complete Blood Count)", code: "CBC001", price: 350, category: "Hematology", type: "PATHOLOGY" },
  { id: "default-2", name: "Lipid Profile", code: "LIPID001", price: 600, category: "Biochemistry", type: "PATHOLOGY" },
  { id: "default-3", name: "Liver Function Test (LFT)", code: "LFT001", price: 800, category: "Biochemistry", type: "PATHOLOGY" },
  { id: "default-4", name: "Kidney Function Test (KFT)", code: "KFT001", price: 700, category: "Biochemistry", type: "PATHOLOGY" },
  { id: "default-5", name: "Thyroid Profile (T3, T4, TSH)", code: "THYROID001", price: 900, category: "Endocrinology", type: "PATHOLOGY" },
  { id: "default-6", name: "Blood Sugar Fasting", code: "BSF001", price: 100, category: "Biochemistry", type: "PATHOLOGY" },
  { id: "default-7", name: "HbA1c", code: "HBA1C001", price: 500, category: "Biochemistry", type: "PATHOLOGY" },
  { id: "default-8", name: "Urine Routine", code: "URINE001", price: 150, category: "Microbiology", type: "PATHOLOGY" },
  { id: "default-9", name: "Typhoid Widal Test", code: "WIDAL001", price: 300, category: "Serology", type: "PATHOLOGY" },
  { id: "default-10", name: "Dengue NS1 Antigen", code: "DENGUE001", price: 800, category: "Serology", type: "PATHOLOGY" },
  { id: "default-11", name: "Malaria Parasite", code: "MP001", price: 200, category: "Parasitology", type: "PATHOLOGY" },
  { id: "default-20", name: "COVID-19 RT-PCR", code: "COVID001", price: 500, category: "Molecular", type: "PATHOLOGY" },
  { id: "default-16", name: "ECG", code: "ECG001", price: 300, category: "Cardiology", type: "PATHOLOGY" },
  { id: "default-17", name: "ECHO", code: "ECHO001", price: 1500, category: "Cardiology", type: "PATHOLOGY" },
]

// Default RADIOLOGY tests
const DEFAULT_RADIOLOGY_TESTS: LabTest[] = [
  { id: "default-12", name: "X-Ray Chest PA View", code: "XRAY001", price: 400, category: "Radiology", type: "RADIOLOGY" },
  { id: "default-13", name: "X-Ray Spine", code: "XRAY002", price: 500, category: "Radiology", type: "RADIOLOGY" },
  { id: "default-14", name: "Ultrasound Abdomen", code: "USG001", price: 800, category: "Radiology", type: "RADIOLOGY" },
  { id: "default-15", name: "Ultrasound Pelvis", code: "USG002", price: 700, category: "Radiology", type: "RADIOLOGY" },
  { id: "default-18", name: "CT Scan Brain", code: "CT001", price: 3000, category: "Radiology", type: "RADIOLOGY" },
  { id: "default-19", name: "MRI Brain", code: "MRI001", price: 6000, category: "Radiology", type: "RADIOLOGY" },
  { id: "default-21", name: "X-Ray Abdomen", code: "XRAY003", price: 450, category: "Radiology", type: "RADIOLOGY" },
  { id: "default-22", name: "X-Ray KUB", code: "XRAY004", price: 400, category: "Radiology", type: "RADIOLOGY" },
  { id: "default-23", name: "CT Scan Chest", code: "CT002", price: 3500, category: "Radiology", type: "RADIOLOGY" },
  { id: "default-24", name: "MRI Spine", code: "MRI002", price: 7000, category: "Radiology", type: "RADIOLOGY" },
  { id: "default-25", name: "Ultrasound Thyroid", code: "USG003", price: 600, category: "Radiology", type: "RADIOLOGY" },
]

export function LabTestSelector({ 
  labTests,
  selectedTests: selectedTestsProp, 
  onTestsChange: onTestsChangeProp,
  availableTests,
  filterType,
  title,
  icon = "pathology"
}: LabTestSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250)
  const [showDropdown, setShowDropdown] = useState(false)
  const [internalSelected, setInternalSelected] = useState<LabTest[]>([])

  // Use internal state when controlled props not provided (e.g. form mode)
  const selectedTests = selectedTestsProp ?? internalSelected
  const onTestsChange = onTestsChangeProp ?? setInternalSelected

  // Get default tests based on filter type
  const getDefaultTests = () => {
    if (filterType === "RADIOLOGY") return DEFAULT_RADIOLOGY_TESTS
    if (filterType === "PATHOLOGY") return DEFAULT_PATHOLOGY_TESTS
    return [...DEFAULT_PATHOLOGY_TESTS, ...DEFAULT_RADIOLOGY_TESTS]
  }

  // Use provided tests (labTests, availableTests) or defaults, filtered by type
  const testCatalog = useMemo(() => {
    const testsSource = availableTests ?? labTests
    let tests = testsSource && testsSource.length > 0 ? testsSource : getDefaultTests()
    
    // Filter by type if specified
    if (filterType) {
      tests = tests.filter(t => t.type === filterType)
    }
    
    return tests
  }, [availableTests, labTests, filterType])

  // Filter tests based on search
  const filteredTests = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return []
    
    const search = debouncedSearchTerm.toLowerCase()
    return testCatalog
      .filter(test => 
        !selectedTests.some(s => s.id === test.id) && // Not already selected
        (test.name.toLowerCase().includes(search) ||
         test.code.toLowerCase().includes(search) ||
         test.category?.toLowerCase().includes(search))
      )
      .slice(0, 10) // Limit results
  }, [debouncedSearchTerm, testCatalog, selectedTests])

  // Add test to selection
  const addTest = (test: LabTest) => {
    onTestsChange([...selectedTests, test])
    setSearchTerm("")
    setShowDropdown(false)
  }

  // Remove test from selection
  const removeTest = (testId: string) => {
    onTestsChange(selectedTests.filter(t => t.id !== testId))
  }

  // Calculate total price
  const totalPrice = selectedTests.reduce((sum, test) => sum + test.price, 0)

  // Get category color
  const getCategoryColor = (category: string | null) => {
    switch (category?.toLowerCase()) {
      case "hematology": return "bg-red-100 text-red-800"
      case "biochemistry": return "bg-blue-100 text-blue-800"
      case "radiology": return "bg-purple-100 text-purple-800"
      case "serology": return "bg-green-100 text-green-800"
      case "microbiology": return "bg-yellow-100 text-yellow-800"
      case "cardiology": return "bg-pink-100 text-pink-800"
      case "endocrinology": return "bg-orange-100 text-orange-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const isRadiology = icon === "radiology" || filterType === "RADIOLOGY"
  const IconComponent = isRadiology ? Radiation : Microscope
  const colorClass = isRadiology ? "text-purple-600" : "text-blue-600"
  const bgClass = isRadiology ? "bg-purple-50" : "bg-blue-50"

  return (
    <Card className={`border-l-4 ${isRadiology ? "border-l-purple-500" : "border-l-blue-500"}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconComponent className={`h-5 w-5 ${colorClass}`} />
          {title || (filterType === "RADIOLOGY" ? "Radiology Tests (X-Ray, CT, MRI)" : "Pathology Tests (Blood, Urine)")}
          {selectedTests.length > 0 && (
            <Badge variant="secondary" className={`ml-2 ${isRadiology ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
              {selectedTests.length} selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden inputs for form submission (when used in server form) */}
        {selectedTests.map((test) => (
          <input key={test.id} type="hidden" name="labTests" value={test.id} />
        ))}
        {/* Search Input */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={filterType === "RADIOLOGY" 
                ? "Search radiology... (X-Ray, CT, MRI, Ultrasound)"
                : "Search pathology... (CBC, LFT, Thyroid)"
              }
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
              className="pl-10"
            />
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && filteredTests.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto">
              {filteredTests.map((test) => (
                <button
                  key={test.id}
                  type="button"
                  className="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center justify-between gap-2"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    addTest(test)
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <IconComponent className={`h-4 w-4 ${colorClass}`} />
                      <p className="font-medium text-sm truncate">{test.name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 ml-6">
                      <span className="text-xs text-muted-foreground font-mono">{test.code}</span>
                      {test.category && (
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 ${getCategoryColor(test.category)}`}>
                          {test.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">₹{test.price}</span>
                    <Plus className="h-4 w-4 text-blue-600" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results message */}
          {showDropdown && searchTerm.trim() && filteredTests.length === 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg p-4 text-center text-muted-foreground text-sm">
              No {filterType?.toLowerCase() || "tests"} found for "{searchTerm}"
            </div>
          )}
        </div>

        {/* Click outside to close */}
        {showDropdown && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
        )}

        {/* Selected Tests List */}
        {selectedTests.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Selected Tests</p>
            <div className="border rounded-md divide-y">
              {selectedTests.map((test, index) => (
                <div 
                  key={test.id}
                  className={`flex items-center justify-between px-3 py-2 hover:bg-muted/30 ${bgClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-5">
                      {index + 1}.
                    </span>
                    <IconComponent className={`h-4 w-4 ${colorClass}`} />
                    <div>
                      <p className="text-sm font-medium">{test.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">{test.code}</span>
                        {test.category && (
                          <Badge variant="outline" className={`text-[10px] px-1 py-0 ${getCategoryColor(test.category)}`}>
                            {test.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold w-16 text-right">₹{test.price}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeTest(test.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-semibold">
                {filterType === "RADIOLOGY" ? "Radiology" : "Pathology"} Total:
              </span>
              <span className="text-lg font-bold text-green-600">₹{totalPrice.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {selectedTests.length === 0 && (
          <div className={`text-center py-4 text-muted-foreground ${bgClass} rounded-md`}>
            <IconComponent className={`h-6 w-6 mx-auto mb-1 opacity-50 ${colorClass}`} />
            <p className="text-sm">No {filterType?.toLowerCase() || "tests"} selected</p>
            <p className="text-xs">Search above to add tests</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export type { LabTest, TestType }
export default LabTestSelector

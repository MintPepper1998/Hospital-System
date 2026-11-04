import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Bed, Users, Activity, FileText, Wrench, Eye, Search, Printer } from "lucide-react"
import { MarkBedReadyButton } from "@/components/ipd/mark-bed-ready-button"
import { Input } from "@/components/ui/input"

interface IPDPageProps {
  searchParams: Promise<{
    q?: string
    ward?: string
    floor?: string
    dischargeDueToday?: string
  }>
}

export default async function IPDDashboardPage({ searchParams }: IPDPageProps) {
  const params = await searchParams
  const q = (params?.q || "").trim().toLowerCase()
  const wardFilter = params?.ward || "ALL"
  const floorFilter = params?.floor || "ALL"
  const dischargeDueToday = params?.dischargeDueToday === "true"

  // Fetch all wards with their beds and current admissions
  const wardsRaw = await prisma.ward.findMany({
    where: { 
      isActive: true,
      type: { not: "EMERGENCY" }
    },
    include: {
      beds: {
        orderBy: { bedNumber: "asc" },
        include: {
          admissions: {
            where: { status: "ADMITTED" },
            include: {
              patient: {
                include: {
                  user: true,
                },
              },
              primaryDoctor: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  const uniqueWards = Array.from(new Set(wardsRaw.map((w) => w.name)))
  const uniqueFloors = Array.from(
    new Set(wardsRaw.map((w) => w.floor || "Unspecified"))
  )

  const now = new Date()
  const wards = wardsRaw
    .filter((ward) => {
      if (wardFilter !== "ALL" && ward.name !== wardFilter) return false
      if (floorFilter !== "ALL" && (ward.floor || "Unspecified") !== floorFilter) return false
      return true
    })
    .map((ward) => ({
      ...ward,
      beds: ward.beds.filter((bed) => {
        const admission = bed.admissions[0]
        const patientName = admission?.patient?.user?.name?.toLowerCase() || ""
        const doctorName = admission?.primaryDoctor?.user?.name?.toLowerCase() || ""
        const bedNo = bed.bedNumber.toLowerCase()
        const matchesSearch =
          !q ||
          patientName.includes(q) ||
          doctorName.includes(q) ||
          bedNo.includes(q)

        const isDueToday =
          !!admission &&
          Math.ceil(
            (now.getTime() - new Date(admission.admissionDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) >= 5

        const matchesDue = !dischargeDueToday || isDueToday
        return matchesSearch && matchesDue
      }),
    }))
    .filter((w) => w.beds.length > 0 || (!q && !dischargeDueToday))

  // Calculate stats
  const totalBeds = await prisma.bed.count()
  const availableBeds = await prisma.bed.count({ where: { status: "AVAILABLE" } })
  const occupiedBeds = await prisma.bed.count({ where: { status: "OCCUPIED" } })
  const admittedPatients = await prisma.iPDAdmission.count({ where: { status: "ADMITTED" } })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blue-600">
            In-Patient Department (IPD)
          </h2>
          <p className="text-muted-foreground mt-2">
            Real-time bed occupancy and patient admission management
          </p>
        </div>
        <Link href="/dashboard/ipd/admission">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="mr-2 h-4 w-4" />
            Admit Patient
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Search patient / bed / doctor
              </label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input name="q" defaultValue={q} className="pl-8" placeholder="e.g. bed B-101 / patient / Dr. name" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ward</label>
              <select name="ward" defaultValue={wardFilter} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="ALL">All Wards</option>
                {uniqueWards.map((ward) => (
                  <option key={ward} value={ward}>{ward}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Floor</label>
              <select name="floor" defaultValue={floorFilter} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="ALL">All Floors</option>
                {uniqueFloors.map((floor) => (
                  <option key={floor} value={floor}>{floor}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" name="dischargeDueToday" value="true" defaultChecked={dischargeDueToday} />
                Discharge due today
              </label>
              <Button type="submit">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBeds}</div>
            <p className="text-xs text-muted-foreground">Across all wards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Bed className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableBeds}</div>
            <p className="text-xs text-muted-foreground">Ready for admission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <Users className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{occupiedBeds}</div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Bed utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Ward-wise Bed Map */}
      <div className="space-y-6">
        {wards.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Bed className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-semibold">No Wards Configured</h3>
                <p className="text-muted-foreground mt-2">
                  Contact administrator to set up wards and beds
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          wards.map((ward) => (
            <Card key={ward.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{ward.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {ward.type} | {ward.floor || "Floor not specified"} |{" "}
                      {ward.beds.length} Bed{ward.beds.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {ward.beds.filter((b) => b.status === "AVAILABLE").length} Available
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {ward.beds.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No beds configured in this ward</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {ward.beds.map((bed) => {
                      const currentAdmission = bed.admissions[0] // Get the active admission
                      const isOccupied = bed.status === "OCCUPIED"
                      const isAvailable = bed.status === "AVAILABLE"
                      const isMaintenance = bed.status === "MAINTENANCE"
                      const isCleaning = bed.status === "CLEANING"

                      return (
                        <div
                          key={bed.id}
                          className={`
                            relative p-4 rounded-lg border-2 transition-all
                            ${
                              isAvailable
                                ? "bg-green-50 border-green-300 hover:bg-green-100 hover:border-green-400"
                                : isOccupied
                                ? "bg-red-50 border-red-300"
                                : isCleaning
                                ? "bg-yellow-50 border-yellow-300"
                                : "bg-gray-100 border-gray-300"
                            }
                          `}
                        >
                          <div className="flex flex-col items-center text-center">
                            <Bed
                              className={`h-6 w-6 mb-2 ${
                                isAvailable
                                  ? "text-green-600"
                                  : isOccupied
                                  ? "text-red-600"
                                  : isCleaning
                                  ? "text-yellow-600"
                                  : "text-gray-600"
                              }`}
                            />
                            <div className="font-semibold text-sm">{bed.bedNumber}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              ₹{bed.pricePerDay}/day
                            </div>

                            {/* Available Bed - Show Admit Button */}
                            {isAvailable && (
                              <div className="mt-2 pt-2 border-t border-green-200 w-full">
                                <Link href={`/dashboard/ipd/admission?bedId=${bed.id}`}>
                                  <Button 
                                    size="sm" 
                                    className="w-full h-7 text-xs bg-green-600 hover:bg-green-700"
                                  >
                                    <UserPlus className="h-3 w-3 mr-1" />
                                    Admit
                                  </Button>
                                </Link>
                              </div>
                            )}

                            {/* Occupied Bed - Show Patient & Discharge */}
                            {isOccupied && currentAdmission && (
                              <div className="mt-2 pt-2 border-t border-red-200 w-full space-y-2">
                                <div className="text-xs font-medium text-red-900 truncate">
                                  {currentAdmission.patient.user.name}
                                </div>
                                <div className="text-xs text-red-700">
                                  Dr. {currentAdmission.primaryDoctor.user.name?.split(" ")[0]}
                                </div>
                                <Link href={`/dashboard/ipd/patient/${currentAdmission.id}`}>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="w-full h-7 text-xs border-blue-600 text-blue-700 hover:bg-blue-50"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                </Link>
                                <Link href={`/dashboard/ipd/print/visitor-pass/${currentAdmission.id}`} target="_blank">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="w-full h-7 text-xs border-amber-600 text-amber-700 hover:bg-amber-50 mt-1"
                                  >
                                    <Printer className="h-3 w-3 mr-1" />
                                    Visitor Pass
                                  </Button>
                                </Link>
                                <Link href={`/dashboard/ipd/discharge/${currentAdmission.id}`}>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="w-full h-7 text-xs border-green-600 text-green-700 hover:bg-green-50 mt-1"
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    Discharge
                                  </Button>
                                </Link>
                              </div>
                            )}

                            {/* Cleaning Bed - Show Mark Ready Button */}
                            {isCleaning && (
                              <div className="mt-2 pt-2 border-t border-yellow-200 w-full space-y-1">
                                <div className="text-xs text-yellow-700 font-medium">
                                  🧹 Cleaning
                                </div>
                                <MarkBedReadyButton bedId={bed.id} bedNumber={bed.bedNumber} />
                              </div>
                            )}

                            {/* Maintenance Bed - Show Status */}
                            {isMaintenance && (
                              <div className="mt-2 pt-2 border-t border-gray-200 w-full space-y-1">
                                <div className="text-xs text-gray-700 font-medium flex items-center justify-center gap-1">
                                  <Wrench className="h-3 w-3" />
                                  Maintenance
                                </div>
                                <MarkBedReadyButton bedId={bed.id} bedNumber={bed.bedNumber} />
                              </div>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div className="absolute top-1 right-1">
                            <div
                              className={`h-2 w-2 rounded-full ${
                                isAvailable
                                  ? "bg-green-500"
                                  : isOccupied
                                  ? "bg-red-500"
                                  : isCleaning
                                  ? "bg-yellow-500"
                                  : "bg-gray-500"
                              }`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-green-500" />
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-red-500" />
              <span className="text-sm">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-yellow-500" />
              <span className="text-sm">Cleaning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-gray-500" />
              <span className="text-sm">Maintenance</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

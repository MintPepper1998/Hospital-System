"use client"

import { useState } from "react"
import { format } from "date-fns"
import { TriageLevel } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { QuickAdmitModal } from "./quick-admit-modal"
import { ManageERDoctorsModal } from "@/components/emergency/manage-er-doctors-modal"
import { Stethoscope, User, AlertTriangle, Bed, Clock, ArrowRight } from "lucide-react"
import { ERActionButtons } from "./er-action-buttons"
import Link from "next/link"
import Image from "next/image"

interface EmergencyClientProps {
  activeVisits: any[]
  doctors: any[]
  activeShifts: any[]
  erWards: any[]
  ipdWards: any[]
}

const getTriageColor = (level: TriageLevel) => {
  switch (level) {
    case "RESUSCITATION": return "bg-red-600 text-white"
    case "EMERGENT": return "bg-orange-500 text-white"
    case "URGENT": return "bg-yellow-500 text-white"
    case "LESS_URGENT": return "bg-green-500 text-white"
    case "NON_URGENT": return "bg-blue-500 text-white"
    default: return "bg-gray-500 text-white"
  }
}

export function EmergencyClient({ activeVisits, doctors, activeShifts, erWards, ipdWards }: EmergencyClientProps) {
  const [isAdmitModalOpen, setIsAdmitModalOpen] = useState(false)
  const [isDoctorsModalOpen, setIsDoctorsModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3">
        <Button 
          onClick={() => setIsDoctorsModalOpen(true)}
          variant="outline"
          className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 font-medium"
        >
          <Stethoscope className="w-4 h-4 mr-2" />
          ER Doctors on Duty ({activeShifts?.length || 0})
        </Button>
        <Button 
          onClick={() => setIsAdmitModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Quick ER Admit
        </Button>
        <Link href="/dashboard/clinical/emergency/records">
          <Button variant="outline" className="border-zinc-200 text-zinc-700 bg-white/60 hover:bg-white font-medium">
            <Clock className="w-4 h-4 mr-2" />
            Past Records
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeVisits.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-[#e0e5ec] rounded-[2rem] neo-pressed">
            <Bed className="h-16 w-16 text-zinc-400 mb-4" />
            <p className="text-lg font-bold text-zinc-600">No active emergency cases</p>
          </div>
        ) : (
          activeVisits.map((visit) => (
            <Card key={visit.id} className="overflow-hidden border-0 shadow-none bg-[#e0e5ec] rounded-[1.5rem] neo-flat">
              <div className={`h-2 w-full ${getTriageColor(visit.triageLevel).split(" ")[0]}`} />
              <CardContent className="p-0">
                <Link href={`/dashboard/clinical/emergency/patient/${visit.id}`}>
                  <div className="p-5 hover:bg-black/5 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-full bg-[#e0e5ec] neo-pressed flex items-center justify-center overflow-hidden">
                          <User className="h-5 w-5 text-zinc-600" />
                          {visit.patient?.user?.image && (
                            <Image
                              src={visit.patient.user.image}
                              alt="Patient"
                              fill
                              className="object-cover z-10"
                              sizes="40px"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-800 line-clamp-1 text-sm">
                            {visit.patient?.user?.name || "Unknown Patient"}
                          </h3>
                          <p className="text-[11px] text-zinc-500 font-semibold">{visit.patient?.patientId}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`border-0 font-bold ${getTriageColor(visit.triageLevel)}`}>
                        {visit.triageLevel}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-xs text-zinc-600">
                        <Clock className="w-3.5 h-3.5 mr-2" />
                        <span className="font-semibold">Arrived:</span>
                        <span className="ml-1">{format(new Date(visit.arrivalTime), "h:mm a")}</span>
                      </div>
                      
                      {visit.chiefComplaint && (
                        <div className="text-xs text-zinc-600">
                          <span className="font-semibold">Complaint:</span>
                          <span className="ml-1 line-clamp-2">{visit.chiefComplaint}</span>
                        </div>
                      )}

                      {visit.bed && (
                        <div className="flex items-center text-xs text-zinc-600">
                          <Bed className="w-3.5 h-3.5 mr-2" />
                          <span className="font-semibold">Bed:</span>
                          <span className="ml-1">{visit.bed.bedNumber} ({visit.bed.ward.name})</span>
                        </div>
                      )}

                      {visit.assignedDoctor && (
                        <div className="flex items-center text-xs text-zinc-600">
                          <Stethoscope className="w-3.5 h-3.5 mr-2" />
                          <span className="font-semibold">Doctor:</span>
                          <span className="ml-1">{visit.assignedDoctor.user.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="p-5 pt-0">
                  <div className="pt-4 border-t border-white/40">
                    <ERActionButtons 
                      visit={visit} 
                      doctors={doctors}
                      ipdWards={ipdWards}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <QuickAdmitModal 
        isOpen={isAdmitModalOpen} 
        onClose={() => setIsAdmitModalOpen(false)}
        activeShifts={activeShifts}
        erWards={erWards}
      />
      
      <ManageERDoctorsModal
        isOpen={isDoctorsModalOpen}
        onClose={() => setIsDoctorsModalOpen(false)}
        doctors={doctors}
        activeShifts={activeShifts}
      />
    </div>
  )
}

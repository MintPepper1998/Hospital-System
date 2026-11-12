import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
}))

const mockAppointmentFindUnique = vi.fn()
const mockAppointmentUpdate = vi.fn()
const mockMedicalRecordFindFirst = vi.fn()
const mockMedicalRecordCreate = vi.fn()
const mockMedicalRecordUpdate = vi.fn()
const mockTransaction = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findUnique: (...args: any[]) => mockAppointmentFindUnique(...args),
      update: (...args: any[]) => mockAppointmentUpdate(...args),
    },
    medicalRecord: {
      findFirst: (...args: any[]) => mockMedicalRecordFindFirst(...args),
      create: (...args: any[]) => mockMedicalRecordCreate(...args),
      update: (...args: any[]) => mockMedicalRecordUpdate(...args),
    },
    $transaction: (fn: any) => fn({
      appointment: { update: mockAppointmentUpdate },
      medicalRecord: {
        findFirst: mockMedicalRecordFindFirst,
        create: mockMedicalRecordCreate,
        update: mockMedicalRecordUpdate,
      },
    }),
  },
}))

describe("completePaperConsultation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("completes consultation on paper with scanned paper URL and updates medical record", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue({
      user: { id: "doc1", email: "dr@hospital.com", role: "DOCTOR", name: "Dr. Doctor" },
      expires: new Date().toISOString(),
    } as any)

    mockAppointmentFindUnique.mockResolvedValue({
      id: "appt-123",
      patientId: "pat-456",
      doctorId: "doc-789",
      status: "VITALS_DONE",
      chiefComplaint: "Severe fever",
      doctor: { user: { name: "Dr. Doctor" } },
      patient: { id: "pat-456", user: { name: "John Doe" } },
    })

    mockAppointmentUpdate.mockResolvedValue({
      id: "appt-123",
      status: "COMPLETED",
      isPaperConsultation: true,
      scannedPaperUrl: "https://s3.amazonaws.com/opd-paper-scans/scan.jpg",
      diagnosis: "Viral Pyrexia",
    })

    mockMedicalRecordFindFirst.mockResolvedValue(null)
    mockMedicalRecordCreate.mockResolvedValue({ id: "mr-1" })

    const { completePaperConsultation } = await import("@/app/actions/clinical")

    const result = await completePaperConsultation({
      appointmentId: "appt-123",
      scannedPaperUrl: "https://s3.amazonaws.com/opd-paper-scans/scan.jpg",
      diagnosis: "Viral Pyrexia",
      notes: "Written on physical slip, patient advised rest",
    })

    expect(result.success).toBe(true)
    expect(mockAppointmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "appt-123" },
        data: expect.objectContaining({
          status: "COMPLETED",
          isPaperConsultation: true,
          scannedPaperUrl: "https://s3.amazonaws.com/opd-paper-scans/scan.jpg",
          diagnosis: "Viral Pyrexia",
        }),
      })
    )

    expect(mockMedicalRecordCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          patientId: "pat-456",
          appointmentId: "appt-123",
          isPaperConsultation: true,
          scannedPaperUrl: "https://s3.amazonaws.com/opd-paper-scans/scan.jpg",
          diagnosis: "Viral Pyrexia",
        }),
      })
    )
  })

  it("uses default diagnosis when omitted for paper consultation", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue({
      user: { id: "rec1", email: "rec@hospital.com", role: "RECEPTIONIST", name: "Receptionist" },
      expires: new Date().toISOString(),
    } as any)

    mockAppointmentFindUnique.mockResolvedValue({
      id: "appt-222",
      patientId: "pat-999",
      doctorId: "doc-789",
      status: "PENDING",
      doctor: { user: { name: "Dr. Doctor" } },
      patient: { id: "pat-999", user: { name: "Alice" } },
    })

    mockAppointmentUpdate.mockResolvedValue({
      id: "appt-222",
      status: "COMPLETED",
      isPaperConsultation: true,
    })

    mockMedicalRecordFindFirst.mockResolvedValue(null)
    mockMedicalRecordCreate.mockResolvedValue({ id: "mr-2" })

    const { completePaperConsultation } = await import("@/app/actions/clinical")

    const result = await completePaperConsultation({
      appointmentId: "appt-222",
    })

    expect(result.success).toBe(true)
    expect(mockAppointmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "appt-222" },
        data: expect.objectContaining({
          status: "COMPLETED",
          isPaperConsultation: true,
          diagnosis: "Treated on Physical OPD Paper",
        }),
      })
    )
  })

  it("throws error for non-existent or cancelled appointments", async () => {
    const { auth } = await import("@/auth")
    vi.mocked(auth).mockResolvedValue({
      user: { id: "doc1", email: "doc@hospital.com", role: "DOCTOR" },
      expires: new Date().toISOString(),
    } as any)

    mockAppointmentFindUnique.mockResolvedValue({
      id: "appt-cancelled",
      status: "CANCELLED",
    })

    const { completePaperConsultation } = await import("@/app/actions/clinical")

    await expect(
      completePaperConsultation({ appointmentId: "appt-cancelled" })
    ).rejects.toThrow("Cannot complete a cancelled appointment")
  })
})

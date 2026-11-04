import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function GlobalSearchPage({ searchParams }: Props) {
  const params = await searchParams
  const q = (params.q || "").trim()

  const [patients, bills, admissions, tests] = q
    ? await Promise.all([
        prisma.patient.findMany({
          where: {
            patientId: { not: "PAT-WALKIN" },
            OR: [
              { patientId: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { user: { name: { contains: q, mode: "insensitive" } } },
            ],
          },
          include: { user: true },
          take: 10,
        }),
        prisma.billing.findMany({
          where: {
            OR: [
              { billNumber: { contains: q, mode: "insensitive" } },
              { patient: { user: { name: { contains: q, mode: "insensitive" } } } },
            ],
          },
          include: { patient: { include: { user: true } } },
          orderBy: { billDate: "desc" },
          take: 10,
        }),
        prisma.iPDAdmission.findMany({
          where: {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { patient: { user: { name: { contains: q, mode: "insensitive" } } } },
            ],
          },
          include: {
            patient: { include: { user: true } },
            bed: true,
          },
          take: 10,
        }),
        prisma.labRequest.findMany({
          where: {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { testName: { contains: q, mode: "insensitive" } },
              { patient: { user: { name: { contains: q, mode: "insensitive" } } } },
            ],
          },
          include: { patient: { include: { user: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
      ])
    : [[], [], [], []]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Global Search</h2>
        <p className="text-muted-foreground">Search patients, bills, admissions and tests</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form method="GET" className="flex gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Type name / UHID / bill no / admission / test..."
              className="h-10 flex-1 rounded-md border px-3 text-sm"
            />
            <button className="h-10 rounded-md bg-primary px-4 text-sm text-primary-foreground">
              <Search className="h-4 w-4" />
            </button>
          </form>
        </CardContent>
      </Card>

      {q && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Patients ({patients.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {patients.map((p) => (
                <Link key={p.id} href={`/dashboard/clinical/patient/${p.id}`} className="block rounded border p-2 hover:bg-muted">
                  <div className="font-medium">{p.user.name}</div>
                  <div className="text-xs text-muted-foreground">{p.patientId} • {p.phone}</div>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Bills ({bills.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {bills.map((b) => (
                <Link key={b.id} href={`/dashboard/finance/billing/${b.id}`} className="block rounded border p-2 hover:bg-muted">
                  <div className="font-medium">{b.billNumber}</div>
                  <div className="text-xs text-muted-foreground">{b.patient.user.name}</div>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Admissions ({admissions.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {admissions.map((a) => (
                <Link key={a.id} href={`/dashboard/ipd/patient/${a.id}`} className="block rounded border p-2 hover:bg-muted">
                  <div className="font-medium">{a.patient.user.name}</div>
                  <div className="text-xs text-muted-foreground">Bed {a.bed.bedNumber} • {a.status}</div>
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Tests ({tests.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {tests.map((t) => (
                <Link key={t.id} href={`/dashboard/lab/entry/${t.id}`} className="block rounded border p-2 hover:bg-muted">
                  <div className="font-medium">{t.testName}</div>
                  <div className="text-xs text-muted-foreground">{t.patient.user.name} • <Badge variant="outline">{t.testType}</Badge></div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}


import { StatCard } from "@/components/dashboard/stat-card"
import { OverviewChart } from "@/components/dashboard/overview-chart"
import { DepartmentChart } from "@/components/dashboard/department-chart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  DollarSign, 
  Calendar, 
  Users, 
  FileText, 
  UserPlus, 
  CalendarPlus,
  Stethoscope,
  CreditCard,
  TrendingUp,
  Activity,
  Building2,
  AlertCircle,
  UtensilsCrossed,
  Ticket,
  Package,
  Salad,
  Coffee,
  Settings,
  BarChart3,
  IndianRupee,
  ClipboardCheck,
  AlertTriangle,
  Receipt,
  HelpCircle,
} from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

// Get current date
const currentDate = new Date().toLocaleDateString("en-US", { 
  weekday: "long", 
  year: "numeric", 
  month: "long", 
  day: "numeric" 
})

const recentActivities = [
  {
    id: 1,
    type: "admission",
    icon: Building2,
    title: "New IPD Admission",
    description: "Patient Rajesh Kumar admitted to ICU",
    time: "5 minutes ago",
    color: "text-blue-500"
  },
  {
    id: 2,
    type: "billing",
    icon: FileText,
    title: "Invoice Generated",
    description: "Bill #INV-2024-1847 for ₹12,450",
    time: "12 minutes ago",
    color: "text-emerald-500"
  },
  {
    id: 3,
    type: "appointment",
    icon: Calendar,
    title: "Appointment Completed",
    description: "Dr. Sharma completed OPD consultation",
    time: "28 minutes ago",
    color: "text-purple-500"
  },
  {
    id: 4,
    type: "surgery",
    icon: Activity,
    title: "Surgery Scheduled",
    description: "Appendectomy scheduled for tomorrow 10:00 AM",
    time: "1 hour ago",
    color: "text-orange-500"
  },
  {
    id: 5,
    type: "alert",
    icon: AlertCircle,
    title: "Low Stock Alert",
    description: "Paracetamol 500mg below minimum level",
    time: "2 hours ago",
    color: "text-red-500"
  }
]

const quickActions = [
  {
    title: "Add Patient",
    icon: UserPlus,
    href: "/dashboard/clinical/opd/register",
    gradient: "from-blue-500 to-blue-600",
    description: "Register new patient"
  },
  {
    title: "Book Appointment",
    icon: CalendarPlus,
    href: "/dashboard/clinical/opd",
    gradient: "from-purple-500 to-purple-600",
    description: "Schedule OPD visit"
  },
  {
    title: "Add Doctor",
    icon: Stethoscope,
    href: "/dashboard/admin/users?role=doctor",
    gradient: "from-emerald-500 to-emerald-600",
    description: "Create staff profile"
  },
  {
    title: "Billing Counter",
    icon: Receipt,
    href: "/dashboard/billing-counter",
    gradient: "from-orange-500 to-orange-600",
    description: "Counter billing & invoices"
  }
]

export default async function AdminDashboardPage() {
  // ── Fetch Canteen Stats ──
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [todayOrders, todayTokens, activeDiets, lowStockItems, mealSlots, unresolvedFeedbackCount] = await Promise.all([
    prisma.canteenMealOrder.aggregate({
      where: { orderDate: { gte: today, lt: tomorrow } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.canteenToken.aggregate({
      where: { issuedAt: { gte: today, lt: tomorrow }, status: { not: "CANCELLED" } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.canteenPatientDiet.count({ where: { isActive: true } }),
    prisma.canteenInventoryItem.count({
      where: {
        isActive: true,
        currentStock: { lte: prisma.canteenInventoryItem.fields.minStockLevel as any },
      },
    }).catch(() => 0), // fallback if raw query needed
    prisma.canteenMealSlot.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.patientFeedback.count({ where: { status: { not: "RESOLVED" } } }),
  ])

  const canteenIpdRevenue = todayOrders._sum.totalAmount || 0
  const canteenWalkinRevenue = todayTokens._sum.totalAmount || 0
  const canteenTotalRevenue = canteenIpdRevenue + canteenWalkinRevenue
  const canteenIpdOrders = todayOrders._count || 0
  const canteenWalkinTokens = todayTokens._count || 0

  // Low stock count using raw query since self-reference compare isn't simple
  let lowStockCount = 0
  try {
    const invItems = await prisma.canteenInventoryItem.findMany({
      where: { isActive: true },
      select: { currentStock: true, minStockLevel: true, name: true, unit: true },
    })
    const lowItems = invItems.filter((i) => i.currentStock <= i.minStockLevel)
    lowStockCount = lowItems.length
  } catch {
    lowStockCount = 0
  }

  return (
    <div className="space-y-6 pb-8 bg-[#e0e5ec] min-h-screen p-4 sm:p-8 rounded-[2.5rem] neo-flat mt-4">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-800">
          Good Morning, Admin 👋
        </h1>
        <p className="text-sm font-semibold text-zinc-500 tracking-wider uppercase">
          {currentDate}
        </p>
      </div>

      {/* Stats Section - 5 Cards */}
      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Total Revenue"
          value="₹4.2L"
          icon={DollarSign}
          badge="+12%"
          variant="neumorphic"
        />
        <StatCard
          title="Appointments"
          value="478"
          icon={Calendar}
          badge="ACTION REQUIRED"
          variant="neumorphic"
        />
        <StatCard
          title="Active Doctors"
          value="45"
          icon={Users}
          badge="TARGET MET"
          variant="neumorphic"
        />
        <StatCard
          title="Pending Bills"
          value="23"
          icon={FileText}
          trend={{ value: "5 due today", isPositive: false }}
          variant="neumorphic"
        />
        <Link href="/dashboard/feedback" className="block transition-transform hover:scale-[1.02]">
          <StatCard
            title="Unresolved Feedback"
            value={unresolvedFeedbackCount.toString()}
            icon={HelpCircle}
            badge="NEEDS ATTENTION"
            variant="neumorphic"
          />
        </Link>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <OverviewChart />
        </div>
        <div className="lg:col-span-1">
          <DepartmentChart />
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          CANTEEN MANAGEMENT SECTION
          ═══════════════════════════════════════════ */}
      <div className="w-full h-1 bg-[#e0e5ec] neo-pressed rounded-full my-6" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full neo-flat bg-[#e0e5ec] text-amber-600">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-800">Canteen Overview</h2>
              <p className="text-xs font-semibold text-zinc-500">Today&apos;s canteen operations at a glance</p>
            </div>
          </div>
          <Link href="/dashboard/canteen/reports">
            <button className="px-4 py-2 text-sm font-bold neo-button rounded-full bg-[#e0e5ec] text-zinc-600 flex items-center transition-all active:scale-95">
              <BarChart3 className="h-4 w-4 mr-2" /> Full Reports
            </button>
          </Link>
        </div>

        {/* Canteen KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Today's Revenue */}
          <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat">
            <div className="flex items-center gap-2 text-zinc-600 text-xs font-bold mb-1">
              <IndianRupee className="h-3.5 w-3.5" />
              Today&apos;s Revenue
            </div>
            <p className="text-2xl font-black text-zinc-800">
              ₹{canteenTotalRevenue.toLocaleString("en-IN")}
            </p>
            <div className="flex gap-3 mt-1.5 text-[10px] font-semibold">
              <span className="text-zinc-500">IPD: ₹{canteenIpdRevenue.toLocaleString("en-IN")}</span>
              <span className="text-zinc-500">Walk-in: ₹{canteenWalkinRevenue.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* IPD Meals Served */}
          <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat">
            <div className="flex items-center gap-2 text-zinc-600 text-xs font-bold mb-1">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              IPD Meals
            </div>
            <p className="text-2xl font-black text-zinc-800">{canteenIpdOrders}</p>
            <p className="text-[10px] font-semibold text-zinc-500 mt-1">meals served today</p>
          </div>

          {/* Walk-in Tokens */}
          <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat">
            <div className="flex items-center gap-2 text-zinc-600 text-xs font-bold mb-1">
              <Ticket className="h-3.5 w-3.5" />
              Walk-in Tokens
            </div>
            <p className="text-2xl font-black text-zinc-800">{canteenWalkinTokens}</p>
            <p className="text-[10px] font-semibold text-zinc-500 mt-1">tokens issued today</p>
          </div>

          {/* Active Diets + Inventory */}
          <div className="p-5 rounded-[1.5rem] bg-[#e0e5ec] neo-flat">
            <div className="flex items-center gap-2 text-zinc-600 text-xs font-bold mb-1">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Active Diets
            </div>
            <p className="text-2xl font-black text-zinc-800">{activeDiets}</p>
            {lowStockCount > 0 && (
              <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {lowStockCount} low stock item(s)
              </div>
            )}
            {lowStockCount === 0 && (
              <p className="text-[10px] font-bold text-green-600 mt-1">Stock levels OK ✓</p>
            )}
          </div>
        </div>

        {/* Canteen Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { title: "Canteen Dashboard", icon: Coffee, href: "/dashboard/canteen" },
            { title: "Manage Menu", icon: Salad, href: "/dashboard/canteen/menu" },
            { title: "IPD Diet Plans", icon: ClipboardCheck, href: "/dashboard/canteen/ipd-diets" },
            { title: "Token Counter", icon: Ticket, href: "/dashboard/canteen/tokens" },
            { title: "Canteen Settings", icon: Settings, href: "/dashboard/admin/settings/canteen" },
          ].map((action) => (
            <Link key={action.title} href={action.href}>
              <div className="p-4 rounded-[1.25rem] bg-[#e0e5ec] neo-button flex flex-col items-center text-center gap-2 cursor-pointer transition-all active:scale-95 text-zinc-600">
                <action.icon className="h-6 w-6" />
                <span className="text-xs font-bold">{action.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="w-full h-1 bg-[#e0e5ec] neo-pressed rounded-full my-6" />

      {/* Activity & Quick Actions Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-[2rem] bg-[#e0e5ec] neo-flat p-6">
          <h3 className="text-lg font-bold flex items-center gap-3 mb-6 text-zinc-800 tracking-tight">
            <div className="p-2 rounded-full neo-pressed bg-[#e0e5ec] text-zinc-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            Recent Activity
          </h3>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-[1.5rem] bg-[#e0e5ec] neo-pressed transition-all"
              >
                <div className={`p-2.5 rounded-full neo-flat bg-[#e0e5ec] text-zinc-600 flex-shrink-0`}>
                  <activity.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-800">
                    {activity.title}
                  </p>
                  <p className="text-xs font-semibold text-zinc-500 truncate mt-0.5">
                    {activity.description}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-wider">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-[2rem] bg-[#e0e5ec] neo-flat p-6">
          <h3 className="text-lg font-bold flex items-center gap-3 mb-6 text-zinc-800 tracking-tight">
            <div className="p-2 rounded-full neo-pressed bg-[#e0e5ec] text-zinc-600">
              <Activity className="h-5 w-5" />
            </div>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-4 h-[calc(100%-4rem)]">
            {quickActions.map((action) => (
              <Link key={action.title} href={action.href}>
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 rounded-[1.5rem] bg-[#e0e5ec] neo-button transition-all duration-300 active:scale-95 text-zinc-600 cursor-pointer"
                >
                  <action.icon className="h-8 w-8" />
                  <div className="text-center">
                    <div className="font-bold text-sm text-zinc-800">
                      {action.title}
                    </div>
                    <div className="text-xs font-semibold text-zinc-500 mt-1">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

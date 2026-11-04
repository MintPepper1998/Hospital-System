import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, CheckCircle2, Clock } from "lucide-react"

export default function UpdatesPage() {
  const updates = [
    {
      version: "Update 1.5",
      date: "Today",
      title: "Lab Signatures & UI Improvements",
      items: [
        "Added support for uploading and managing Lab Technician and Pathologist digital signatures.",
        "Signatures now automatically appear at the bottom of printed lab test reports.",
        "Added the ability to instantly remove uploaded signatures when needed.",
        "Removed the 'Seed Default Tests' option from the Pathology settings.",
        "Removed the glowing mouse cursor effect across the system for a cleaner interface.",
      ]
    },
    {
      version: "Update 1.4",
      date: "Today",
      title: "Lab Test Reports & Inventory Polish",
      items: [
        "Improved the print preview layout for Laboratory test reports.",
        "Fixed an issue causing duplicate inventory stock entries when adding purchase invoices.",
        "Streamlined the inventory process: stock can now only be edited through the secure purchase invoice flow.",
      ]
    },
    {
      version: "Update 1.3",
      date: "Yesterday",
      title: "WhatsApp Marketing & Audit Logging",
      items: [
        "Introduced a brand new dedicated WhatsApp Marketing module.",
        "Added comprehensive system-wide audit logging to track user activity securely.",
        "Fixed filters in the audit logs page to properly show all system modules and users.",
        "Made phone numbers optional during new patient registration.",
      ]
    },
    {
      version: "Update 1.2",
      date: "3 Days Ago",
      title: "HR Attendance & Registration Updates",
      items: [
        "Launched the new HR Attendance feature for tracking staff.",
        "Resolved issues with automatic Employee ID generation.",
        "Fixed pharmacy purchase pack size calculations.",
      ]
    },
    {
      version: "Update 1.1",
      date: "Last Week",
      title: "OPD Billing & Appointment Fixes",
      items: [
        "Fixed OPD billing dialogs and enhanced printed receipt layouts.",
        "Added support for sending bills directly via WhatsApp.",
        "Added an option to delete employee records with proper confirmation.",
        "Resolved server crashing issues related to the book appointment page.",
      ]
    },
    {
      version: "Update 1.0",
      date: "2 Weeks Ago",
      title: "Emergency Room & Pharmacy Features",
      items: [
        "Added 'Medicine Out' feature to the Pharmacy dashboard.",
        "Enhanced the Emergency Room dashboard with Patient 360 view.",
        "Added support for OPD cancellations and processing refunds.",
      ]
    }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-blue-600 flex items-center gap-2">
          <Activity className="h-8 w-8" />
          System Updates
        </h2>
        <p className="text-muted-foreground mt-1">
          Keep track of new features, improvements, and bug fixes added to the hospital ERP system.
        </p>
      </div>

      <div className="space-y-6">
        {updates.map((update, idx) => (
          <Card key={idx} className="relative overflow-hidden border-l-4 border-l-blue-500">
            {idx === 0 && (
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                Latest
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <span className="font-semibold text-blue-600">{update.version}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {update.date}
                </span>
              </div>
              <CardTitle className="text-xl">{update.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {update.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

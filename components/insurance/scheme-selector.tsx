"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ShieldCheck, Building2, Heart } from "lucide-react"

interface SchemeSelectorProps {
  value: string
  onChange: (scheme: string) => void
}

const schemes = [
  {
    id: "PRIVATE",
    label: "Private Insurance",
    description: "TPA / Private Health Insurance",
    icon: ShieldCheck,
    color: "border-blue-500 bg-blue-50 text-blue-700",
  },
  {
    id: "PMJAY",
    label: "Ayushman Bharat (PMJAY)",
    description: "Rs.5 Lakh coverage per family",
    icon: Heart,
    color: "border-green-500 bg-green-50 text-green-700",
  },
  {
    id: "BSKY",
    label: "BSKY",
    description: "Biju Swasthya Kalyan Yojana",
    icon: Building2,
    color: "border-orange-500 bg-orange-50 text-orange-700",
  },
]

export function InsuranceSchemeSelector({ value, onChange }: SchemeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {schemes.map((scheme) => {
        const Icon = scheme.icon
        const isSelected = value === scheme.id
        return (
          <Card
            key={scheme.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              isSelected ? scheme.color : "border-transparent hover:border-gray-200"
            )}
            onClick={() => onChange(scheme.id)}
          >
            <CardContent className="flex flex-col items-center text-center p-6 gap-3">
              <Icon className={cn("h-8 w-8", isSelected ? "" : "text-gray-400")} />
              <div>
                <p className="font-semibold text-sm">{scheme.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{scheme.description}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

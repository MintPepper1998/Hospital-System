"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, Loader2, AlertCircle } from "lucide-react"

export function PublicHolidays() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHolidays() {
      const year = new Date().getFullYear()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)

      let response: Response | null = null
      try {
        response = await fetch(
          `https://date.nager.at/api/v3/PublicHolidays/${year}/IN`,
          { signal: controller.signal }
        )
      } catch {
        // Network error or timeout — silently degrade
        setError("Could not load holiday data")
        setIsLoading(false)
        return
      } finally {
        clearTimeout(timeout)
      }

      if (!response || !response.ok) {
        setError("Could not load holiday data")
        setIsLoading(false)
        return
      }

      // Read body as text to avoid json() crash on empty body
      const text = await response.text().catch(() => "")
      if (!text || !text.trim()) {
        setError("Could not load holiday data")
        setIsLoading(false)
        return
      }

      let data: any[]
      try {
        data = JSON.parse(text)
      } catch {
        setError("Could not load holiday data")
        setIsLoading(false)
        return
      }

      // Filter upcoming holidays
      const today = new Date()
      const upcoming = data.filter((h: any) => new Date(h.date) >= today).slice(0, 5)
      setHolidays(upcoming)
      setIsLoading(false)
    }
    fetchHolidays()
  }, [])

  if (isLoading) {
    return (
      <Card className="border-t-4 border-t-indigo-500">
        <CardContent className="pt-6 flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-t-4 border-t-red-500">
        <CardContent className="pt-6 flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-t-4 border-t-indigo-500 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          Upcoming Public Holidays
          <CalendarIcon className="h-4 w-4 text-indigo-600" />
        </CardTitle>
        <CardDescription className="text-xs">
          National holidays (Source: Nager.Date)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {holidays.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No upcoming holidays found</p>
          ) : (
            holidays.map((h, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{h.localName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'long' })}
                  </span>
                </div>
                {new Date(h.date).toDateString() === new Date().toDateString() ? (
                  <Badge className="bg-red-500 text-[10px]">Today</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-700">Upcoming</Badge>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

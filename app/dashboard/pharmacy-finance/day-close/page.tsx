import { getDayCloseDraft, getRecentCloses } from "@/app/actions/pharmacy-fin/day-close"
import { DayCloseClient } from "@/components/pharmacy-finance/day-close-client"
import { getPharmacyAccounts } from "@/lib/pharmacy-finance/actions"

export const metadata = { title: "Day Close" }

export default async function DayClosePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  
  // Default to today
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  const dateStr = typeof sp.date === "string" ? sp.date : todayStr
  
  const allAccounts = await getPharmacyAccounts()
  const cashAccounts = allAccounts.filter(a => a.type === "CASH")
  const accountId = typeof sp.accountId === "string" ? sp.accountId : cashAccounts[0]?.id

  let draft: any = null
  let recent: any[] = []

  if (accountId) {
    try {
      draft = await getDayCloseDraft(dateStr, accountId)
      recent = await getRecentCloses(accountId)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <DayCloseClient 
      dateStr={dateStr} 
      accountId={accountId} 
      cashAccounts={cashAccounts} 
      draft={draft}
      recent={recent} 
    />
  )
}

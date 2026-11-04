import {
  getHospitalCashAccounts,
  getHospitalDayCloseDraft,
  getRecentHospitalCloses,
} from "@/app/actions/master-finance-day-close"
import { MasterDayCloseClient } from "./day-close-client"

export const metadata = { title: "Day Close — Master Finance" }

export default async function MasterDayClosePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  const dateStr = typeof sp.date === "string" ? sp.date : todayStr

  const accountsResult = await getHospitalCashAccounts()
  const cashAccounts = accountsResult.data || []
  const accountId = typeof sp.accountId === "string" ? sp.accountId : cashAccounts[0]?.id || ""

  let draft: any = null
  let recent: any[] = []

  if (accountId) {
    try {
      draft = await getHospitalDayCloseDraft(dateStr, accountId)
      recent = await getRecentHospitalCloses(accountId)
    } catch (err) {
      console.error("Error fetching hospital day close draft:", err)
    }
  }

  return (
    <MasterDayCloseClient
      dateStr={dateStr}
      accountId={accountId}
      cashAccounts={JSON.parse(JSON.stringify(cashAccounts))}
      draft={JSON.parse(JSON.stringify(draft))}
      recent={JSON.parse(JSON.stringify(recent))}
    />
  )
}


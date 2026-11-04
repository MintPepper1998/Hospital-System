import { getFiscalYears } from "@/app/actions/master-finance"
import { FiscalYearClient } from "./fiscal-year-client"

export default async function FiscalYearPage() {
  const fiscalYears = await getFiscalYears()
  return <FiscalYearClient fiscalYears={JSON.parse(JSON.stringify(fiscalYears))} />
}

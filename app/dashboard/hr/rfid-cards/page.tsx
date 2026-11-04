import { getStaffRfidList } from "@/app/actions/rfid-cards"
import { RfidCardsClient } from "./rfid-cards-client"

export default async function RfidCardsPage() {
  const result = await getStaffRfidList()
  return <RfidCardsClient initialStaff={result.data || []} />
}

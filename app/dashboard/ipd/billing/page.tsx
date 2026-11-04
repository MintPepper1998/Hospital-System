import { redirect } from "next/navigation"

export default async function IPDBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (typeof val === "string") {
      query.set(key, val)
    } else if (Array.isArray(val)) {
      val.forEach((v) => query.append(key, v))
    }
  }
  const queryString = query.toString()
  redirect(`/dashboard/billing-counter/ipd${queryString ? `?${queryString}` : ""}`)
}

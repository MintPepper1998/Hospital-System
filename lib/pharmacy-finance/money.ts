export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const round4 = (n: number) => Math.round((n + Number.EPSILON) * 10000) / 10000
export const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0))
export const signed = (t: { type: string; amount: number }) => (t.type === "INCOME" ? t.amount : -t.amount)
export const inr = (n: number | null | undefined, frac = 2) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  }).format(round2(n ?? 0))
export const pct = (num: number, den: number) => (den === 0 ? 0 : round2((num / den) * 100))

/**
 * Converts a number into Indian currency words representation.
 * Example: 1000 -> "One Thousand Rupees Only"
 * Example: 1550.50 -> "One Thousand Five Hundred and Fifty Rupees and Fifty Paise Only"
 */
export function numberToWordsRupees(amount: number): string {
  if (isNaN(amount) || amount === 0) return "Zero Rupees Only"

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

  function convertInteger(n: number): string {
    if (n === 0) return ""
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "")
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convertInteger(n % 100) : "")
    if (n < 100000) return convertInteger(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convertInteger(n % 1000) : "")
    if (n < 10000000) return convertInteger(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convertInteger(n % 100000) : "")
    return convertInteger(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convertInteger(n % 10000000) : "")
  }

  const positive = Math.abs(amount)
  const rupees = Math.floor(positive)
  const paise = Math.round((positive - rupees) * 100)

  let result = "Rupees " + convertInteger(rupees).trim()
  if (paise > 0) {
    result += " and " + convertInteger(paise).trim() + " Paise"
  }
  result += " Only"

  return result
}

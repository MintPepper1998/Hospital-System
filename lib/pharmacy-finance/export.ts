export async function exportRows(filename: string, rows: Record<string, unknown>[], format: "csv" | "xlsx") {
  // Dynamically import xlsx so it doesn't bloat the main bundle
  const XLSX = await import("xlsx")
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Data")
  
  XLSX.writeFile(wb, `${filename}.${format}`, { bookType: format === "csv" ? "csv" : "xlsx" })
}

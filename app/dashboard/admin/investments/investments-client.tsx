"use client"

import { useState, useTransition, useMemo, useCallback } from "react"
import { format } from "date-fns"
import { DollarSign, Landmark, TrendingUp, TrendingDown, Plus, Users, Wallet, CreditCard, Building2, Briefcase, FileText, Search, Download, ArrowUpDown, CalendarDays, Pencil, Trash2, X, AlertTriangle } from "lucide-react"
import { createInvestor, createInvestmentInflow, createCapitalExpense, updateCapitalExpense, deleteCapitalExpense, updateInvestor, deleteInvestor, updateInvestmentInflow, deleteInvestmentInflow } from "@/lib/actions/investments"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

export function InvestmentsClient({
    investors,
    expenses,
    totalRaised,
    totalDeployed,
    availableCapital
}: {
    investors: any[]
    expenses: any[]
    totalRaised: number
    totalDeployed: number
    availableCapital: number
}) {
    const [activeTab, setActiveTab] = useState<"INVESTORS" | "EXPENSES">("INVESTORS")
    const [showAddInvestor, setShowAddInvestor] = useState(false)
    const [showAddInflow, setShowAddInflow] = useState<string | null>(null) // Contains investor ID
    const [showAddExpense, setShowAddExpense] = useState(false)
    const [editingExpense, setEditingExpense] = useState<any>(null)
    const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null)
    const [editingInvestor, setEditingInvestor] = useState<any>(null)
    const [deletingInvestorId, setDeletingInvestorId] = useState<string | null>(null)
    const [editingInflow, setEditingInflow] = useState<any>(null)
    const [deletingInflowId, setDeletingInflowId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    // ---- Custom Category Management ----
    const DEFAULT_CATEGORIES = [
        { value: "MEDICAL_EQUIPMENT", label: "Medical Equipment & Machinery" },
        { value: "CONSTRUCTION", label: "Construction & Interior" },
        { value: "IT_INFRASTRUCTURE", label: "IT & Software Infrastructure" },
        { value: "LICENSING_LEGAL", label: "Licensing & Legal" },
        { value: "FURNITURE", label: "Furniture & Fixtures" },
        { value: "MARKETING_SETUP", label: "Initial Marketing & Branding" },
        { value: "OTHER_CAPEX", label: "Other CapEx" },
    ]
    const [customCategories, setCustomCategories] = useState<{ value: string; label: string }[]>([])
    const [showCategoryCreator, setShowCategoryCreator] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState("")
    const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORIES[0].value)

    const allCategories = useMemo(() => {
        const generated = new Map<string, { value: string; label: string }>()

        // 1. Core defaults
        DEFAULT_CATEGORIES.forEach(c => generated.set(c.value, c))

        // 2. Extract any historic custom categories the user already saved to DB
        expenses.forEach((e: any) => {
            if (e.category && !generated.has(e.category)) {
                generated.set(e.category, { value: e.category, label: e.category.replace(/_/g, ' ') })
            }
        })

        // 3. Add any they just created locally in this session
        customCategories.forEach(c => generated.set(c.value, c))

        return Array.from(generated.values())
    }, [expenses, customCategories])

    // ---- Category Search (CapEx Tab) ----
    const [categorySearch, setCategorySearch] = useState("")
    const debouncedCategorySearch = useDebouncedValue(categorySearch, 300)
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null)

    // ---- Date Range Filter ----
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")

    // ---- Sort Config ----
    const [sortColumn, setSortColumn] = useState<string>("date")
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

    const handleSort = (col: string) => {
        if (sortColumn === col) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc")
        } else {
            setSortColumn(col)
            setSortDirection(col === "amount" ? "desc" : "asc")
        }
    }

    // Derive unique categories from expenses + compute filtered list
    const uniqueExpenseCategories = useMemo(() => {
        const cats = new Set(expenses.map((e: any) => e.category as string))
        return Array.from(cats).sort()
    }, [expenses])

    const filteredExpenses = useMemo(() => {
        let filtered = expenses
        // Apply debounced text search
        if (debouncedCategorySearch.trim()) {
            const q = debouncedCategorySearch.toLowerCase()
            filtered = filtered.filter((e: any) =>
                e.category.toLowerCase().replace(/_/g, ' ').includes(q) ||
                e.description?.toLowerCase().includes(q) ||
                e.vendor?.toLowerCase().includes(q)
            )
        }
        // Apply chip filter
        if (activeCategoryFilter) {
            filtered = filtered.filter((e: any) => e.category === activeCategoryFilter)
        }
        // Apply date range filter
        if (dateFrom) {
            const from = new Date(dateFrom)
            filtered = filtered.filter((e: any) => new Date(e.date) >= from)
        }
        if (dateTo) {
            const to = new Date(dateTo)
            to.setHours(23, 59, 59, 999)
            filtered = filtered.filter((e: any) => new Date(e.date) <= to)
        }
        // Apply sort
        filtered = [...filtered].sort((a: any, b: any) => {
            let cmp = 0
            switch (sortColumn) {
                case 'date': cmp = new Date(a.date).getTime() - new Date(b.date).getTime(); break
                case 'category': cmp = a.category.localeCompare(b.category); break
                case 'description': cmp = (a.description || '').localeCompare(b.description || ''); break
                case 'vendor': cmp = (a.vendor || '').localeCompare(b.vendor || ''); break
                case 'amount': cmp = a.amount - b.amount; break
                default: cmp = 0
            }
            return sortDirection === 'asc' ? cmp : -cmp
        })
        return filtered
    }, [expenses, debouncedCategorySearch, activeCategoryFilter, dateFrom, dateTo, sortColumn, sortDirection])

    // ---- Computed totals for filtered expenses ----
    const filteredTotal = useMemo(() =>
        filteredExpenses.reduce((sum: number, e: any) => sum + e.amount, 0)
        , [filteredExpenses])

    // ---- PDF Generator ----
    const handleDownloadPDF = useCallback(async () => {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

        // Header — Hospital branding
        doc.setFillColor(15, 23, 42) // Slate-900
        doc.rect(0, 0, 297, 28, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('SHREE KAMAL HOSPITAL', 14, 12)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text('Capital Investment Ledger — Expenditure Report', 14, 19)

        // Report metadata
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        const generatedAt = format(new Date(), "dd MMM yyyy, hh:mm a")
        doc.text(`Generated: ${generatedAt}`, 297 - 14, 12, { align: 'right' })

        // Filter info
        let filterInfo = `Showing ${filteredExpenses.length} of ${expenses.length} records`
        if (activeCategoryFilter) filterInfo += `  |  Category: ${activeCategoryFilter.replace(/_/g, ' ')}`
        if (dateFrom || dateTo) filterInfo += `  |  Date: ${dateFrom || '...'} to ${dateTo || '...'}`
        if (debouncedCategorySearch) filterInfo += `  |  Search: "${debouncedCategorySearch}"`
        doc.text(filterInfo, 297 - 14, 19, { align: 'right' })

        // Table
        const tableData = filteredExpenses.map((e: any) => [
            format(new Date(e.date), 'dd MMM yyyy'),
            e.category.replace(/_/g, ' '),
            e.description || '-',
            e.vendor || '-',
            e.invoiceNumber || '-',
            `Rs.${e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ])

        // Grand total row
        tableData.push([
            '', '', '', '', 'TOTAL:',
            `Rs.${filteredTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ])

        autoTable(doc, {
            startY: 34,
            head: [['Date', 'Category', 'Description', 'Vendor', 'Invoice #', 'Amount (INR)']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
            headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 28 },
                5: { halign: 'right', fontStyle: 'bold' },
            },
            didParseCell: (data: any) => {
                // Style the total row
                if (data.row.index === tableData.length - 1) {
                    data.cell.styles.fillColor = [15, 23, 42]
                    data.cell.styles.textColor = [255, 255, 255]
                    data.cell.styles.fontStyle = 'bold'
                }
            },
        })

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(7)
            doc.setTextColor(148, 163, 184)
            doc.text(`Page ${i} of ${pageCount}  |  Strictly Confidential — Shree Kamal Hospital Investment Ledger`, 14, 200)
        }

        const filename = `CapEx_Report_${activeCategoryFilter ? activeCategoryFilter + '_' : ''}${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`

        // Detect Tauri environment — WebView2 blocks blob download via anchor click
        const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__
        if (isTauri) {
            // In Tauri: render PDF in an in-app overlay using Chrome's built-in PDF viewer
            const pdfBlob = doc.output('blob')
            const blobUrl = URL.createObjectURL(pdfBlob)

            // Create full-screen overlay
            const overlay = document.createElement('div')
            overlay.id = 'sk-pdf-overlay'
            overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,0.85);display:flex;flex-direction:column;backdrop-filter:blur(4px);animation:sk-fade-in 0.2s ease;'

            // Toolbar
            const toolbar = document.createElement('div')
            toolbar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 24px;background:#0f172a;border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;'

            const titleSpan = document.createElement('span')
            titleSpan.textContent = `📄 ${filename}`
            titleSpan.style.cssText = 'color:#e2e8f0;font-weight:600;font-size:14px;letter-spacing:0.02em;'
            toolbar.appendChild(titleSpan)

            const btnGroup = document.createElement('div')
            btnGroup.style.cssText = 'display:flex;gap:8px;align-items:center;'

            // Print button
            const printBtn = document.createElement('button')
            printBtn.textContent = '🖨️ Print'
            printBtn.style.cssText = 'background:#0d9488;color:white;border:none;padding:8px 18px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;transition:background 0.2s;'
            printBtn.onmouseenter = () => { printBtn.style.background = '#0f766e' }
            printBtn.onmouseleave = () => { printBtn.style.background = '#0d9488' }
            printBtn.onclick = () => {
                const iframeEl = document.getElementById('sk-pdf-iframe') as HTMLIFrameElement
                if (iframeEl?.contentWindow) iframeEl.contentWindow.print()
            }
            btnGroup.appendChild(printBtn)

            // Close button
            const closeBtn = document.createElement('button')
            closeBtn.textContent = '✕ Close'
            closeBtn.style.cssText = 'background:#334155;color:#e2e8f0;border:1px solid rgba(255,255,255,0.15);padding:8px 18px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;transition:all 0.2s;'
            closeBtn.onmouseenter = () => { closeBtn.style.background = '#475569' }
            closeBtn.onmouseleave = () => { closeBtn.style.background = '#334155' }
            closeBtn.onclick = () => {
                document.body.removeChild(overlay)
                URL.revokeObjectURL(blobUrl)
            }
            btnGroup.appendChild(closeBtn)
            toolbar.appendChild(btnGroup)

            // Iframe (Chrome's built-in PDF viewer)
            const iframe = document.createElement('iframe')
            iframe.id = 'sk-pdf-iframe'
            iframe.src = blobUrl
            iframe.style.cssText = 'flex:1;border:none;width:100%;background:#525659;'

            overlay.appendChild(toolbar)
            overlay.appendChild(iframe)
            document.body.appendChild(overlay)

            // Also allow closing with Escape key
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    const el = document.getElementById('sk-pdf-overlay')
                    if (el) { document.body.removeChild(el); URL.revokeObjectURL(blobUrl) }
                    document.removeEventListener('keydown', handleEsc)
                }
            }
            document.addEventListener('keydown', handleEsc)
        } else {
            doc.save(filename)
        }
    }, [filteredExpenses, filteredTotal, expenses.length, activeCategoryFilter, dateFrom, dateTo, debouncedCategorySearch])

    // ---- RENDER FORMS (Modals via absolute overlays within the dashboard) ----
    const renderAddInvestorForm = () => (
        <div className="sk-modal-backdrop">
            <div className="sk-modal-card">
                <div className="sk-modal-header">
                    <h3>Register New Investor</h3>
                    <p>Add a new capital partner to the ledger.</p>
                </div>
                <form action={(formData) => {
                    startTransition(async () => {
                        await createInvestor(formData)
                        setShowAddInvestor(false)
                    })
                }}>
                    <div className="sk-form-grid">
                        <div className="sk-input-group">
                            <label>Entity / Individual Name*</label>
                            <input type="text" name="name" required placeholder="Shree Capital Partners" />
                        </div>
                        <div className="sk-input-group">
                            <label>Contact Person</label>
                            <input type="text" name="contactPerson" placeholder="Mr. A. Sharma" />
                        </div>
                        <div className="sk-input-group">
                            <label>Email Address</label>
                            <input type="email" name="email" placeholder="contact@shreecapital.com" />
                        </div>
                        <div className="sk-input-group">
                            <label>Phone Number</label>
                            <input type="text" name="phone" placeholder="+91 98765 43210" />
                        </div>
                        <div className="sk-input-group sk-full-width">
                            <label>Registered Address</label>
                            <input type="text" name="address" placeholder="123 Banking District, Mumbai" />
                        </div>
                        <div className="sk-input-group sk-full-width">
                            <label>Internal Notes / Classification</label>
                            <input type="text" name="notes" placeholder="Series A Lead Investor" />
                        </div>
                    </div>
                    <div className="sk-modal-footer">
                        <button type="button" onClick={() => setShowAddInvestor(false)} className="sk-btn sk-btn-ghost">Cancel</button>
                        <button type="submit" disabled={isPending} className="sk-btn sk-btn-gold">
                            {isPending ? "Registering..." : "Register Investor"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    const renderAddInflowForm = () => {
        const investor = investors.find(i => i.id === showAddInflow)
        return (
            <div className="sk-modal-backdrop">
                <div className="sk-modal-card">
                    <div className="sk-modal-header sk-modal-header-emerald">
                        <h3>Log Capital Inflow</h3>
                        <p>Record funds received from <strong>{investor?.name}</strong>.</p>
                    </div>
                    <form action={(formData) => {
                        formData.append("investorId", investor.id)
                        startTransition(async () => {
                            await createInvestmentInflow(formData)
                            setShowAddInflow(null)
                        })
                    }}>
                        <div className="sk-form-grid">
                            <div className="sk-input-group">
                                <label>Amount Received (INR)*</label>
                                <input type="number" step="0.01" name="amount" required placeholder="5000000" />
                            </div>
                            <div className="sk-input-group">
                                <label>Date Received</label>
                                <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="sk-input-group">
                                <label>Transfer Method</label>
                                <select name="method">
                                    <option value="WIRE_TRANSFER">Wire Transfer / NEFT / RTGS</option>
                                    <option value="CHEQUE">Cheque</option>
                                    <option value="CASH">Cash</option>
                                </select>
                            </div>
                            <div className="sk-input-group">
                                <label>Transaction Reference (UTR/Cheque No.)</label>
                                <input type="text" name="transactionRef" placeholder="UTRB123456789" />
                            </div>
                            <div className="sk-input-group sk-full-width">
                                <label>Notes</label>
                                <input type="text" name="notes" placeholder="Tranche 1 funding" />
                            </div>
                        </div>
                        <div className="sk-modal-footer">
                            <button type="button" onClick={() => setShowAddInflow(null)} className="sk-btn sk-btn-ghost">Cancel</button>
                            <button type="submit" disabled={isPending} className="sk-btn sk-btn-emerald">
                                {isPending ? "Logging..." : "Confirm Inflow"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    const renderAddExpenseForm = () => (
        <div className="sk-modal-backdrop">
            <div className="sk-modal-card">
                <div className="sk-modal-header">
                    <h3>Log Capital Expenditure (CapEx)</h3>
                    <p>Record setup, equipment, or infrastructural costs isolated from daily ops.</p>
                </div>
                <form action={(formData) => {
                    startTransition(async () => {
                        await createCapitalExpense(formData)
                        setShowAddExpense(false)
                    })
                }}>
                    <div className="sk-form-grid">
                        <div className="sk-input-group">
                            <label>Expenditure Amount (INR)*</label>
                            <input type="number" step="0.01" name="amount" required placeholder="1500000" />
                        </div>
                        <div className="sk-input-group">
                            <label>Date Commited/Paid</label>
                            <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} />
                        </div>
                        <div className="sk-input-group">
                            <label>Ledger Category*</label>
                            <input type="hidden" name="category" value={selectedCategory} />
                            <div className="sk-category-picker">
                                <select
                                    value={showCategoryCreator ? "__NEW__" : selectedCategory}
                                    onChange={(e) => {
                                        if (e.target.value === "__NEW__") {
                                            setShowCategoryCreator(true)
                                        } else {
                                            setSelectedCategory(e.target.value)
                                            setShowCategoryCreator(false)
                                        }
                                    }}
                                    required
                                >
                                    {allCategories.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                    <option disabled>─────────────────</option>
                                    <option value="__NEW__">＋ Add New Category...</option>
                                </select>
                                {showCategoryCreator && (
                                    <div className="sk-new-category-row">
                                        <div className="sk-new-category-input-wrap">
                                            <input
                                                type="text"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                placeholder="e.g. Transport & Logistics"
                                                autoFocus
                                                className="sk-new-category-input"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        if (newCategoryName.trim()) {
                                                            const val = newCategoryName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
                                                            setCustomCategories(prev => [...prev, { value: val, label: newCategoryName.trim() }])
                                                            setSelectedCategory(val)
                                                            setNewCategoryName("")
                                                            setShowCategoryCreator(false)
                                                        }
                                                    }
                                                    if (e.key === 'Escape') {
                                                        setShowCategoryCreator(false)
                                                        setNewCategoryName("")
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="sk-btn-add-cat"
                                            onClick={() => {
                                                if (newCategoryName.trim()) {
                                                    const val = newCategoryName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
                                                    setCustomCategories(prev => [...prev, { value: val, label: newCategoryName.trim() }])
                                                    setSelectedCategory(val)
                                                    setNewCategoryName("")
                                                    setShowCategoryCreator(false)
                                                }
                                            }}
                                        >
                                            Add
                                        </button>
                                        <button
                                            type="button"
                                            className="sk-btn-cancel-cat"
                                            onClick={() => {
                                                setShowCategoryCreator(false)
                                                setNewCategoryName("")
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="sk-input-group">
                            <label>Vendor / Recipient</label>
                            <input type="text" name="vendor" placeholder="GE Healthcare" />
                        </div>
                        <div className="sk-input-group sk-full-width">
                            <label>Description of Asset / Service*</label>
                            <input type="text" name="description" required placeholder="Siemens 1.5T MRI Scanner installation" />
                        </div>
                        <div className="sk-input-group">
                            <label>Invoice Number</label>
                            <input type="text" name="invoiceNumber" placeholder="INV-GE-2024-001" />
                        </div>
                        <div className="sk-input-group">
                            <label>Payment Reference / UTR</label>
                            <input type="text" name="transactionRef" placeholder="UTRB987654321" />
                        </div>
                        <div className="sk-input-group sk-full-width">
                            <label>Additional Notes</label>
                            <input type="text" name="notes" placeholder="5 year AMC included" />
                        </div>
                    </div>
                    <div className="sk-modal-footer">
                        <button type="button" onClick={() => setShowAddExpense(false)} className="sk-btn sk-btn-ghost">Cancel</button>
                        <button type="submit" disabled={isPending} className="sk-btn sk-btn-slate">
                            {isPending ? "Logging..." : "Confirm Expenditure"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    const renderEditExpenseForm = () => (
        <div className="sk-modal-backdrop">
            <div className="sk-modal-card">
                <div className="sk-modal-header">
                    <h3>Edit Capital Expenditure (CapEx)</h3>
                    <p>Update details for this capital expense entry.</p>
                </div>
                <form action={(formData) => {
                    startTransition(async () => {
                        await updateCapitalExpense(editingExpense.id, formData)
                        setEditingExpense(null)
                    })
                }}>
                    <div className="sk-form-grid">
                        <div className="sk-input-group">
                            <label>Expenditure Amount (INR)*</label>
                            <input type="number" step="0.01" name="amount" required placeholder="1500000" defaultValue={editingExpense.amount} />
                        </div>
                        <div className="sk-input-group">
                            <label>Date Commited/Paid</label>
                            <input type="date" name="date" defaultValue={new Date(editingExpense.date).toISOString().split('T')[0]} />
                        </div>
                        <div className="sk-input-group">
                            <label>Ledger Category*</label>
                            <input type="hidden" name="category" value={selectedCategory} />
                            <div className="sk-category-picker">
                                <select
                                    value={showCategoryCreator ? "__NEW__" : selectedCategory}
                                    onChange={(e) => {
                                        if (e.target.value === "__NEW__") {
                                            setShowCategoryCreator(true)
                                        } else {
                                            setSelectedCategory(e.target.value)
                                            setShowCategoryCreator(false)
                                        }
                                    }}
                                    required
                                >
                                    {allCategories.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                    <option disabled>─────────────────</option>
                                    <option value="__NEW__">＋ Add New Category...</option>
                                </select>
                                {showCategoryCreator && (
                                    <div className="sk-new-category-row">
                                        <div className="sk-new-category-input-wrap">
                                            <input
                                                type="text"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                placeholder="e.g. Transport & Logistics"
                                                autoFocus
                                                className="sk-new-category-input"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        if (newCategoryName.trim()) {
                                                            const val = newCategoryName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
                                                            setCustomCategories(prev => [...prev, { value: val, label: newCategoryName.trim() }])
                                                            setSelectedCategory(val)
                                                            setNewCategoryName("")
                                                            setShowCategoryCreator(false)
                                                        }
                                                    }
                                                    if (e.key === 'Escape') {
                                                        setShowCategoryCreator(false)
                                                        setNewCategoryName("")
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="sk-btn-add-cat"
                                            onClick={() => {
                                                if (newCategoryName.trim()) {
                                                    const val = newCategoryName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')
                                                    setCustomCategories(prev => [...prev, { value: val, label: newCategoryName.trim() }])
                                                    setSelectedCategory(val)
                                                    setNewCategoryName("")
                                                    setShowCategoryCreator(false)
                                                }
                                            }}
                                        >
                                            Add
                                        </button>
                                        <button
                                            type="button"
                                            className="sk-btn-cancel-cat"
                                            onClick={() => {
                                                setShowCategoryCreator(false)
                                                setNewCategoryName("")
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="sk-input-group">
                            <label>Vendor / Recipient</label>
                            <input type="text" name="vendor" placeholder="GE Healthcare" defaultValue={editingExpense.vendor || ''} />
                        </div>
                        <div className="sk-input-group sk-full-width">
                            <label>Description of Asset / Service*</label>
                            <input type="text" name="description" required placeholder="Siemens 1.5T MRI Scanner installation" defaultValue={editingExpense.description || ''} />
                        </div>
                        <div className="sk-input-group">
                            <label>Invoice Number</label>
                            <input type="text" name="invoiceNumber" placeholder="INV-GE-2024-001" defaultValue={editingExpense.invoiceNumber || ''} />
                        </div>
                        <div className="sk-input-group">
                            <label>Payment Reference / UTR</label>
                            <input type="text" name="transactionRef" placeholder="UTRB987654321" defaultValue={editingExpense.transactionRef || ''} />
                        </div>
                        <div className="sk-input-group sk-full-width">
                            <label>Additional Notes</label>
                            <input type="text" name="notes" placeholder="5 year AMC included" defaultValue={editingExpense.notes || ''} />
                        </div>
                    </div>
                    <div className="sk-modal-footer">
                        <button type="button" onClick={() => setEditingExpense(null)} className="sk-btn sk-btn-ghost">Cancel</button>
                        <button type="submit" disabled={isPending} className="sk-btn sk-btn-slate">
                            {isPending ? "Updating..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    const renderDeleteConfirmModal = () => {
        const expenseToDelete = expenses.find((e: any) => e.id === deletingExpenseId)
        return (
            <div className="sk-modal-backdrop">
                <div className="sk-delete-modal-card">
                    <div className="sk-delete-modal-header">
                        <div className="sk-delete-icon-wrap">
                            <AlertTriangle size={28} />
                        </div>
                        <h3>Delete Capital Expense</h3>
                        <p>
                            Are you sure you want to delete this expense?
                            {expenseToDelete && (
                                <>
                                    <br />
                                    <strong style={{ color: '#0f172a' }}>
                                        {expenseToDelete.description} — ₹{expenseToDelete.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </strong>
                                </>
                            )}
                            <br />
                            This action cannot be undone.
                        </p>
                    </div>
                    <div className="sk-delete-modal-footer">
                        <button
                            type="button"
                            onClick={() => setDeletingExpenseId(null)}
                            className="sk-btn sk-btn-ghost"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isPending}
                            className="sk-btn sk-btn-danger"
                            onClick={() => {
                                startTransition(async () => {
                                    await deleteCapitalExpense(deletingExpenseId!)
                                    setDeletingExpenseId(null)
                                })
                            }}
                        >
                            {isPending ? "Deleting..." : "Yes, Delete"}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const renderEditInvestorForm = () => (
        <div className="sk-modal-backdrop">
            <div className="sk-modal-card">
                <div className="sk-modal-header">
                    <h3>Edit Investor</h3>
                    <p>Update details for <strong>{editingInvestor.name}</strong>.</p>
                </div>
                <form action={(formData) => {
                    startTransition(async () => {
                        await updateInvestor(editingInvestor.id, formData)
                        setEditingInvestor(null)
                    })
                }}>
                    <div className="sk-form-grid">
                        <div className="sk-input-group">
                            <label>Entity / Individual Name*</label>
                            <input type="text" name="name" required placeholder="Shree Capital Partners" defaultValue={editingInvestor.name} />
                        </div>
                        <div className="sk-input-group">
                            <label>Contact Person</label>
                            <input type="text" name="contactPerson" placeholder="Mr. A. Sharma" defaultValue={editingInvestor.contactPerson || ''} />
                        </div>
                        <div className="sk-input-group">
                            <label>Email Address</label>
                            <input type="email" name="email" placeholder="contact@shreecapital.com" defaultValue={editingInvestor.email || ''} />
                        </div>
                        <div className="sk-input-group">
                            <label>Phone Number</label>
                            <input type="text" name="phone" placeholder="+91 98765 43210" defaultValue={editingInvestor.phone || ''} />
                        </div>
                        <div className="sk-input-group sk-full-width">
                            <label>Registered Address</label>
                            <input type="text" name="address" placeholder="123 Banking District, Mumbai" defaultValue={editingInvestor.address || ''} />
                        </div>
                        <div className="sk-input-group sk-full-width">
                            <label>Internal Notes / Classification</label>
                            <input type="text" name="notes" placeholder="Series A Lead Investor" defaultValue={editingInvestor.notes || ''} />
                        </div>
                    </div>
                    <div className="sk-modal-footer">
                        <button type="button" onClick={() => setEditingInvestor(null)} className="sk-btn sk-btn-ghost">Cancel</button>
                        <button type="submit" disabled={isPending} className="sk-btn sk-btn-gold">
                            {isPending ? "Updating..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    const renderDeleteInvestorModal = () => {
        const investorToDelete = investors.find((i: any) => i.id === deletingInvestorId)
        const inflowCount = investorToDelete?.inflows?.length || 0
        return (
            <div className="sk-modal-backdrop">
                <div className="sk-delete-modal-card">
                    <div className="sk-delete-modal-header">
                        <div className="sk-delete-icon-wrap">
                            <AlertTriangle size={28} />
                        </div>
                        <h3>Delete Investor</h3>
                        <p>
                            Are you sure you want to delete <strong style={{ color: '#0f172a' }}>{investorToDelete?.name}</strong>?
                            {inflowCount > 0 && (
                                <>
                                    <br />
                                    This will also delete <strong style={{ color: '#dc2626' }}>{inflowCount} inflow record{inflowCount !== 1 ? 's' : ''}</strong>.
                                </>
                            )}
                            <br />
                            This action cannot be undone.
                        </p>
                    </div>
                    <div className="sk-delete-modal-footer">
                        <button type="button" onClick={() => setDeletingInvestorId(null)} className="sk-btn sk-btn-ghost">Cancel</button>
                        <button
                            type="button"
                            disabled={isPending}
                            className="sk-btn sk-btn-danger"
                            onClick={() => {
                                startTransition(async () => {
                                    await deleteInvestor(deletingInvestorId!)
                                    setDeletingInvestorId(null)
                                })
                            }}
                        >
                            {isPending ? "Deleting..." : "Yes, Delete"}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const renderEditInflowForm = () => (
        <div className="sk-modal-backdrop">
            <div className="sk-modal-card">
                <div className="sk-modal-header sk-modal-header-emerald">
                    <h3>Edit Capital Inflow</h3>
                    <p>Update inflow record for <strong>{editingInflow.investorName}</strong>.</p>
                </div>
                <form action={(formData) => {
                    startTransition(async () => {
                        await updateInvestmentInflow(editingInflow.id, formData)
                        setEditingInflow(null)
                    })
                }}>
                    <div className="sk-form-grid">
                        <div className="sk-input-group">
                            <label>Amount Received (INR)*</label>
                            <input type="number" step="0.01" name="amount" required placeholder="5000000" defaultValue={editingInflow.amount} />
                        </div>
                        <div className="sk-input-group">
                            <label>Date Received</label>
                            <input type="date" name="date" defaultValue={new Date(editingInflow.date).toISOString().split('T')[0]} />
                        </div>
                        <div className="sk-input-group">
                            <label>Transfer Method</label>
                            <select name="method" defaultValue={editingInflow.method || 'WIRE_TRANSFER'}>
                                <option value="WIRE_TRANSFER">Wire Transfer / NEFT / RTGS</option>
                                <option value="CHEQUE">Cheque</option>
                                <option value="CASH">Cash</option>
                            </select>
                        </div>
                        <div className="sk-input-group">
                            <label>Transaction Reference (UTR/Cheque No.)</label>
                            <input type="text" name="transactionRef" placeholder="UTRB123456789" defaultValue={editingInflow.transactionRef || ''} />
                        </div>
                        <div className="sk-input-group sk-full-width">
                            <label>Notes</label>
                            <input type="text" name="notes" placeholder="Tranche 1 funding" defaultValue={editingInflow.notes || ''} />
                        </div>
                    </div>
                    <div className="sk-modal-footer">
                        <button type="button" onClick={() => setEditingInflow(null)} className="sk-btn sk-btn-ghost">Cancel</button>
                        <button type="submit" disabled={isPending} className="sk-btn sk-btn-emerald">
                            {isPending ? "Updating..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )

    const renderDeleteInflowModal = () => {
        // Find the inflow from any investor
        let inflowToDelete: any = null
        for (const inv of investors) {
            const found = inv.inflows?.find((i: any) => i.id === deletingInflowId)
            if (found) { inflowToDelete = found; break }
        }
        return (
            <div className="sk-modal-backdrop">
                <div className="sk-delete-modal-card">
                    <div className="sk-delete-modal-header">
                        <div className="sk-delete-icon-wrap">
                            <AlertTriangle size={28} />
                        </div>
                        <h3>Delete Inflow Record</h3>
                        <p>
                            Are you sure you want to delete this inflow?
                            {inflowToDelete && (
                                <>
                                    <br />
                                    <strong style={{ color: '#0f172a' }}>
                                        {format(new Date(inflowToDelete.date), 'dd MMM yyyy')} — ₹{inflowToDelete.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </strong>
                                </>
                            )}
                            <br />
                            This action cannot be undone.
                        </p>
                    </div>
                    <div className="sk-delete-modal-footer">
                        <button type="button" onClick={() => setDeletingInflowId(null)} className="sk-btn sk-btn-ghost">Cancel</button>
                        <button
                            type="button"
                            disabled={isPending}
                            className="sk-btn sk-btn-danger"
                            onClick={() => {
                                startTransition(async () => {
                                    await deleteInvestmentInflow(deletingInflowId!)
                                    setDeletingInflowId(null)
                                })
                            }}
                        >
                            {isPending ? "Deleting..." : "Yes, Delete"}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="sk-investments">
            {/* Modals */}
            {showAddInvestor && renderAddInvestorForm()}
            {showAddInflow && renderAddInflowForm()}
            {showAddExpense && renderAddExpenseForm()}
            {editingExpense && renderEditExpenseForm()}
            {deletingExpenseId && renderDeleteConfirmModal()}
            {editingInvestor && renderEditInvestorForm()}
            {deletingInvestorId && renderDeleteInvestorModal()}
            {editingInflow && renderEditInflowForm()}
            {deletingInflowId && renderDeleteInflowModal()}

            {/* Header & Aesthetic Title */}
            <div className="sk-inv-header">
                <div className="sk-inv-title-area">
                    <div className="sk-crest"><Landmark size={24} /></div>
                    <div>
                        <h1 className="sk-title">Capital Investment Ledger</h1>
                        <p className="sk-subtitle">Strictly isolated institutional treasury and setup capital</p>
                    </div>
                </div>
            </div>

            {/* Massive KPI Board */}
            <div className="sk-kpi-board">
                <div className="sk-kpi-card sk-kpi-raised">
                    <div className="sk-kpi-bg-glow" />
                    <div className="sk-kpi-top">
                        <span className="sk-kpi-label">TOTAL CAPITAL RAISED</span>
                        <TrendingUp size={18} className="sk-kpi-icon" />
                    </div>
                    <div className="sk-kpi-value">
                        <span className="sk-currency">{"\u20B9"}</span>
                        {totalRaised.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="sk-kpi-bar" style={{ width: "100%" }} />
                </div>

                <div className="sk-kpi-card sk-kpi-deployed">
                    <div className="sk-kpi-bg-glow" />
                    <div className="sk-kpi-top">
                        <span className="sk-kpi-label">CAPITAL DEPLOYED (CAPEX)</span>
                        <TrendingDown size={18} className="sk-kpi-icon" />
                    </div>
                    <div className="sk-kpi-value">
                        <span className="sk-currency">{"\u20B9"}</span>
                        {totalDeployed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="sk-kpi-bar" style={{ width: `${totalRaised ? (totalDeployed / Math.max(totalRaised, 1)) * 100 : 0}%` }} />
                </div>

                <div className={`sk-kpi-card ${availableCapital < 0 ? 'sk-kpi-negative' : 'sk-kpi-available'}`}>
                    <div className="sk-kpi-bg-glow" />
                    <div className="sk-kpi-top">
                        <span className="sk-kpi-label">AVAILABLE CAPITAL</span>
                        <Wallet size={18} className="sk-kpi-icon" />
                    </div>
                    <div className="sk-kpi-value">
                        <span className="sk-currency">{"\u20B9"}</span>
                        {availableCapital.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="sk-kpi-bar" style={{ width: `${totalRaised ? (Math.abs(availableCapital) / Math.max(totalRaised, 1)) * 100 : 0}%` }} />
                </div>
            </div>

            {/* Control Tabs */}
            <div className="sk-inv-controls">
                <div className="sk-inv-tabs">
                    <button
                        className={`sk-tab ${activeTab === "INVESTORS" ? "sk-tab-active" : ""}`}
                        onClick={() => setActiveTab("INVESTORS")}
                    >
                        <Users size={16} /> Investor Portfolio
                    </button>
                    <button
                        className={`sk-tab ${activeTab === "EXPENSES" ? "sk-tab-active" : ""}`}
                        onClick={() => setActiveTab("EXPENSES")}
                    >
                        <Building2 size={16} /> Capital Expenses (CapEx)
                    </button>
                </div>

                <div className="sk-inv-actions">
                    {activeTab === "INVESTORS" ? (
                        <button className="sk-action-btn sk-action-gold" onClick={() => setShowAddInvestor(true)}>
                            <Plus size={16} /> Register New Investor
                        </button>
                    ) : (
                        <button className="sk-action-btn sk-action-slate" onClick={() => setShowAddExpense(true)}>
                            <Plus size={16} /> Log Capital Expense
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Content */}
            <div className="sk-inv-content">
                {activeTab === "INVESTORS" && (
                    <div className="sk-grid-view">
                        {investors.length === 0 ? (
                            <div className="sk-empty-state">
                                <Briefcase size={32} />
                                <p>No investors registered yet.</p>
                            </div>
                        ) : (
                            investors.map(investor => {
                                const totalContributed = investor.inflows.reduce((sum: number, inc: any) => sum + inc.amount, 0)
                                return (
                                    <div key={investor.id} className="sk-investor-card">
                                        <div className="sk-investor-info">
                                            <div className="sk-investor-info-top">
                                                <h3>{investor.name}</h3>
                                                <div className="sk-investor-actions">
                                                    <button
                                                        className="sk-row-action-btn sk-row-edit"
                                                        title="Edit investor"
                                                        onClick={() => setEditingInvestor(investor)}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        className="sk-row-action-btn sk-row-delete"
                                                        title="Delete investor"
                                                        onClick={() => setDeletingInvestorId(investor.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            {investor.contactPerson && <p className="sk-contact">Contact: {investor.contactPerson}</p>}
                                            {investor.email && <p className="sk-meta">{investor.email} {investor.phone ? ` • ${investor.phone}` : ''}</p>}
                                            {investor.notes && <p className="sk-notes">{investor.notes}</p>}
                                        </div>
                                        <div className="sk-investor-finance">
                                            <div className="sk-contributed">
                                                <span className="label">Total Contributed</span>
                                                <span className="amount">{"\u20B9"}{totalContributed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                            <button className="sk-log-inflow-btn" onClick={() => setShowAddInflow(investor.id)}>
                                                <DollarSign size={14} /> Log New Inflow
                                            </button>
                                        </div>
                                        {investor.inflows && investor.inflows.length > 0 && (
                                            <div className="sk-inflow-history">
                                                <div className="sk-history-header">Inflow History</div>
                                                {investor.inflows.map((inflow: any) => (
                                                    <div key={inflow.id} className="sk-history-row">
                                                        <span className="date">{format(new Date(inflow.date), "dd MMM yyyy")}</span>
                                                        <span className="method">{inflow.method?.replace(/_/g, " ") || "-"}</span>
                                                        <span className="ref">{inflow.transactionRef || "-"}</span>
                                                        <span className="amount text-emerald-400">{"\u20B9"}{inflow.amount.toLocaleString("en-IN")}</span>
                                                        <span className="sk-inflow-actions">
                                                            <button className="sk-row-action-btn sk-row-edit sk-row-action-sm" title="Edit inflow" onClick={() => setEditingInflow({ ...inflow, investorName: investor.name })}>
                                                                <Pencil size={12} />
                                                            </button>
                                                            <button className="sk-row-action-btn sk-row-delete sk-row-action-sm" title="Delete inflow" onClick={() => setDeletingInflowId(inflow.id)}>
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}

                {activeTab === "EXPENSES" && (
                    <div className="sk-table-container">
                        {/* Search + Date Range + Download Controls */}
                        <div className="sk-capex-search-bar">
                            <div className="sk-capex-toolbar">
                                <div className="sk-search-input-wrap">
                                    <Search size={16} className="sk-search-icon" />
                                    <input
                                        type="text"
                                        value={categorySearch}
                                        onChange={(e) => setCategorySearch(e.target.value)}
                                        placeholder="Search by category, description, or vendor..."
                                        className="sk-search-input"
                                    />
                                    {categorySearch && (
                                        <button
                                            className="sk-search-clear"
                                            onClick={() => { setCategorySearch(""); setActiveCategoryFilter(null) }}
                                        >✕</button>
                                    )}
                                </div>
                                <div className="sk-date-range">
                                    <CalendarDays size={14} className="sk-date-icon" />
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="sk-date-input"
                                        title="From date"
                                    />
                                    <span className="sk-date-sep">—</span>
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="sk-date-input"
                                        title="To date"
                                    />
                                    {(dateFrom || dateTo) && (
                                        <button className="sk-search-clear" onClick={() => { setDateFrom(""); setDateTo("") }}>✕</button>
                                    )}
                                </div>
                                <button className="sk-download-btn" onClick={handleDownloadPDF} title="Export filtered results as PDF">
                                    <Download size={15} /> Download PDF
                                </button>
                            </div>
                            {uniqueExpenseCategories.length > 0 && (
                                <div className="sk-category-chips">
                                    <button
                                        className={`sk-chip ${!activeCategoryFilter ? 'sk-chip-active' : ''}`}
                                        onClick={() => setActiveCategoryFilter(null)}
                                    >All ({expenses.length})</button>
                                    {uniqueExpenseCategories.map(cat => {
                                        const count = expenses.filter((e: any) => e.category === cat).length
                                        return (
                                            <button
                                                key={cat}
                                                className={`sk-chip ${activeCategoryFilter === cat ? 'sk-chip-active' : ''}`}
                                                onClick={() => setActiveCategoryFilter(activeCategoryFilter === cat ? null : cat)}
                                            >
                                                {cat.replace(/_/g, ' ')} ({count})
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                            {(debouncedCategorySearch || activeCategoryFilter || dateFrom || dateTo) && (
                                <div className="sk-search-results-count">
                                    Showing <strong>{filteredExpenses.length}</strong> of <strong>{expenses.length}</strong> expenses
                                    {activeCategoryFilter && <> in <span className="sk-filter-tag">{activeCategoryFilter.replace(/_/g, ' ')}</span></>}
                                    {(dateFrom || dateTo) && <> • <span className="sk-filter-tag">{dateFrom || '...'} → {dateTo || '...'}</span></>}
                                    &nbsp;•&nbsp; Total: <strong>₹{filteredTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                                </div>
                            )}
                        </div>

                        {filteredExpenses.length === 0 ? (
                            <div className="sk-empty-state">
                                <Search size={32} />
                                <p>{expenses.length === 0 ? 'No capital expenses logged yet.' : 'No expenses match your search.'}</p>
                                {expenses.length > 0 && (
                                    <button className="sk-btn sk-btn-ghost" onClick={() => { setCategorySearch(""); setActiveCategoryFilter(null) }}>
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <table className="sk-expense-table">
                                <thead>
                                    <tr>
                                        <th className="sk-th-sortable" onClick={() => handleSort('date')}>
                                            Date <ArrowUpDown size={12} className={sortColumn === 'date' ? 'sk-sort-active' : 'sk-sort-icon'} />
                                        </th>
                                        <th className="sk-th-sortable" onClick={() => handleSort('category')}>
                                            Category <ArrowUpDown size={12} className={sortColumn === 'category' ? 'sk-sort-active' : 'sk-sort-icon'} />
                                        </th>
                                        <th className="sk-th-sortable" onClick={() => handleSort('description')}>
                                            Description <ArrowUpDown size={12} className={sortColumn === 'description' ? 'sk-sort-active' : 'sk-sort-icon'} />
                                        </th>
                                        <th className="sk-th-sortable" onClick={() => handleSort('vendor')}>
                                            Vendor/Invoice <ArrowUpDown size={12} className={sortColumn === 'vendor' ? 'sk-sort-active' : 'sk-sort-icon'} />
                                        </th>
                                        <th className="text-right sk-th-sortable" onClick={() => handleSort('amount')}>
                                            Amount (INR) <ArrowUpDown size={12} className={sortColumn === 'amount' ? 'sk-sort-active' : 'sk-sort-icon'} />
                                        </th>
                                        <th className="sk-th-actions">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses.map((expense: any) => (
                                        <tr key={expense.id}>
                                            <td className="sk-cell-date">{format(new Date(expense.date), "dd MMM yyyy")}</td>
                                            <td>
                                                <span
                                                    className={`sk-badge ${activeCategoryFilter === expense.category ? 'sk-badge-highlight' : ''}`}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setActiveCategoryFilter(activeCategoryFilter === expense.category ? null : expense.category)}
                                                >
                                                    {expense.category.replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td className="sk-cell-desc">
                                                <strong>{expense.description}</strong>
                                                {expense.notes && <span className="sk-cell-sub">{expense.notes}</span>}
                                            </td>
                                            <td className="sk-cell-vendor">
                                                {expense.vendor || "-"}
                                                {expense.invoiceNumber && <span className="sk-cell-sub">{expense.invoiceNumber}</span>}
                                            </td>
                                            <td className="text-right sk-cell-amount">{"\u20B9"}{expense.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="sk-cell-actions">
                                                <div className="sk-actions-wrap">
                                                    <button
                                                        className="sk-row-action-btn sk-row-edit"
                                                        title="Edit expense"
                                                        onClick={() => {
                                                            setSelectedCategory(expense.category)
                                                            setEditingExpense(expense)
                                                        }}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        className="sk-row-action-btn sk-row-delete"
                                                        title="Delete expense"
                                                        onClick={() => setDeletingExpenseId(expense.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="sk-totals-row">
                                        <td colSpan={5} className="sk-totals-label">
                                            Total ({filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''})
                                        </td>
                                        <td className="text-right sk-totals-amount">
                                            {"\u20B9"}{filteredTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Scoped Styling for the "High-End Institutional Treasury" Aesthetic (Light Version) */}
            <style>{`
        /* Fonts loaded via next/font in layout.tsx, using CSS variables */

        .sk-investments {
          font-family: var(--font-dm-sans), sans-serif;
          background: #f8fafc; /* Light slate background matching hospital theme */
          min-height: calc(100vh - 4rem);
          margin: -2rem; /* Negate the generic dashboard padding */
          padding: 3rem;
          color: #0f172a;
          position: relative;
          overflow: hidden;
        }

        /* Subtle grid background */
        .sk-investments::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 0;
          pointer-events: none;
        }

        .sk-inv-header, .sk-kpi-board, .sk-inv-controls, .sk-inv-content {
          position: relative;
          z-index: 10;
          max-width: 1400px;
          margin: 0 auto;
        }

        .sk-inv-header {
          margin-bottom: 3rem;
        }

        .sk-inv-title-area {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .sk-crest {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #f1f5f9, #ffffff);
          border: 1px solid rgba(13, 148, 136, 0.3); /* teal rim to match hospital theme */
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0d9488; /* hospital teal */
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .sk-title {
          font-family: 'Playfair Display', serif;
          font-size: 2.25rem;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.02em;
          color: #0f172a;
        }

        .sk-subtitle {
          color: #64748b;
          margin: 0.25rem 0 0;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 500;
        }

        .sk-kpi-board {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .sk-kpi-card {
          position: relative;
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .sk-kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        .sk-kpi-bg-glow {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at center, rgba(13, 148, 136, 0.04) 0%, transparent 50%);
          pointer-events: none;
        }

        .sk-kpi-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .sk-kpi-label {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: #64748b;
        }

        .sk-kpi-value {
          font-family: 'Playfair Display', serif;
          font-size: 3.5rem;
          font-weight: 600;
          line-height: 1;
          color: #0f172a;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: baseline;
          gap: 0.25rem;
        }

        .sk-currency {
          font-family: 'DM Sans', sans-serif;
          font-size: 1.5rem;
          color: #94a3b8;
          font-weight: 400;
        }

        .sk-kpi-bar {
          height: 3px;
          border-radius: 3px;
          background: #e2e8f0;
        }

        /* Specific Accents (Adapted for Light Mode) */
        .sk-kpi-raised .sk-kpi-icon { color: #d97706; } /* darker gold */
        .sk-kpi-raised .sk-kpi-bar { background: linear-gradient(90deg, #f59e0b, #d97706); }

        .sk-kpi-deployed .sk-kpi-icon { color: #e11d48; } /* darker rose */
        .sk-kpi-deployed .sk-kpi-bar { background: linear-gradient(90deg, #fb3a5d, #e11d48); }

        .sk-kpi-available .sk-kpi-icon { color: #059669; } /* darker emerald */
        .sk-kpi-available .sk-kpi-bar { background: linear-gradient(90deg, #10b981, #059669); }
        
        .sk-kpi-negative .sk-kpi-value, .sk-kpi-negative .sk-currency, .sk-kpi-negative .sk-kpi-icon { color: #dc2626; } /* Red alert colors */
        .sk-kpi-negative .sk-kpi-bar { background: linear-gradient(90deg, #ef4444, #b91c1c); width: 100% !important; }
        .sk-kpi-negative { animation: warningPulse 3s infinite; }
        @keyframes warningPulse { 
            0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); border-color: rgba(220, 38, 38, 0.5); } 
            70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); border-color: rgba(0, 0, 0, 0.05); } 
            100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); border-color: rgba(0, 0, 0, 0.05); } 
        }

        /* Controls */
        .sk-inv-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          padding-bottom: 1rem;
        }

        .sk-inv-tabs {
          display: flex;
          gap: 2rem;
        }

        .sk-tab {
          background: transparent;
          border: none;
          color: #64748b;
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          padding: 0.5rem 0;
          position: relative;
          transition: color 0.2s ease;
        }

        .sk-tab:hover { color: #334155; }
        .sk-tab-active { color: #0d9488; } /* Hospital Teal */

        .sk-tab-active::after {
          content: '';
          position: absolute;
          bottom: -1rem;
          left: 0;
          width: 100%;
          height: 3px;
          background: #0d9488;
        }

        .sk-action-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .sk-action-gold {
          background: #fffbeb;
          color: #d97706;
          border-color: #fde68a;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .sk-action-gold:hover { background: #fef3c7; }

        .sk-action-slate {
          background: #0d9488; /* Primary action color */
          color: #ffffff;
          box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.2), 0 2px 4px -2px rgba(13, 148, 136, 0.2);
        }
        .sk-action-slate:hover { background: #0f766e; }

        /* Grid View (Investors) */
        .sk-grid-view {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 1.5rem;
        }

        .sk-investor-card {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.02);
        }

        .sk-investor-info h3 {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0 0 0.5rem;
          color: #0f172a;
        }

        .sk-contact { color: #334155; font-size: 0.9rem; margin: 0 0 0.25rem; font-weight: 500; }
        .sk-meta { color: #64748b; font-size: 0.8rem; margin: 0 0 0.75rem; }
        .sk-notes { color: #475569; font-size: 0.85rem; margin: 0; font-style: italic; border-left: 2px solid #cbd5e1; padding-left: 0.75rem;}

        .sk-investor-finance {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px dashed rgba(0, 0, 0, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        .sk-contributed {
          display: flex;
          flex-direction: column;
        }

        .sk-contributed .label { font-size: 0.7rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 2px; }
        .sk-contributed .amount { font-family: 'Playfair Display', serif; font-size: 1.75rem; color: #0d9488; font-weight: 700; line-height: 1.1; }

        .sk-log-inflow-btn {
          background: #f0fdfa;
          border: 1px solid #99f6e4;
          color: #0d9488;
          border-radius: 6px;
          padding: 0.4rem 0.75rem;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
        }
        .sk-log-inflow-btn:hover { background: #ccfbf1; }

        .sk-inflow-history {
          margin-top: 1.5rem;
          background: #f8fafc;
          border-radius: 8px;
          padding: 1rem;
          border: 1px solid #e2e8f0;
        }
        
        .sk-history-header {
          font-size: 0.7rem;
          text-transform: uppercase;
          color: #475569;
          letter-spacing: 0.05em;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
        }

        .sk-history-row {
          display: grid;
          grid-template-columns: 80px 100px 1fr 100px;
          font-size: 0.8rem;
          padding: 0.35rem 0;
          color: #475569;
          align-items: center;
        }
        .sk-history-row:not(:last-child) { border-bottom: 1px dotted #e2e8f0; }
        .sk-history-row .amount { text-align: right; font-weight: 600; color: #059669; }

        /* Table View (Expenses) */
        .sk-table-container {
          background: #ffffff;
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.02);
        }

        .sk-expense-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .sk-expense-table th {
          background: #f8fafc;
          padding: 1rem 1.5rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
          font-weight: 600;
        }

        .sk-expense-table td {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: top;
        }

        .sk-expense-table tr:hover td {
          background: #f0fdfa; /* pale teal hover */
        }

        .sk-cell-date { color: #64748b; font-size: 0.85rem; font-weight: 500; }
        .sk-badge {
          background: #e0f2fe;
          color: #0369a1;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        
        .sk-cell-desc strong { display: block; color: #0f172a; font-weight: 500; font-size: 0.95rem; }
        .sk-cell-vendor { color: #334155; font-size: 0.9rem; font-weight: 500; }
        .sk-cell-sub { display: block; color: #64748b; font-size: 0.8rem; margin-top: 0.25rem; font-weight: normal; }
        .sk-cell-amount {
          font-family: 'Playfair Display', serif;
          font-size: 1.25rem;
          color: #0f172a;
          font-weight: 700;
        }

        /* ── CapEx Search Bar ── */
        .sk-capex-search-bar {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sk-search-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          max-width: 480px;
        }

        .sk-search-icon {
          position: absolute;
          left: 0.85rem;
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
        }

        .sk-search-input {
          width: 100%;
          padding: 0.65rem 2.25rem 0.65rem 2.5rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-family: inherit;
          font-size: 0.875rem;
          color: #0f172a;
          background: #ffffff;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sk-search-input:focus {
          outline: none;
          border-color: #0d9488;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
        }
        .sk-search-input::placeholder { color: #94a3b8; }

        .sk-search-clear {
          position: absolute;
          right: 0.6rem;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 0.25rem 0.35rem;
          border-radius: 4px;
          transition: all 0.15s;
          line-height: 1;
        }
        .sk-search-clear:hover { color: #ef4444; background: #fef2f2; }

        /* Category Filter Chips */
        .sk-category-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .sk-chip {
          padding: 0.3rem 0.7rem;
          font-size: 0.72rem;
          font-weight: 600;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          text-transform: capitalize;
          white-space: nowrap;
          letter-spacing: 0.01em;
        }
        .sk-chip:hover { border-color: #0d9488; color: #0d9488; background: #f0fdfa; }
        .sk-chip-active {
          background: #0d9488 !important;
          color: #ffffff !important;
          border-color: #0d9488 !important;
          box-shadow: 0 1px 3px rgba(13, 148, 136, 0.3);
        }

        .sk-search-results-count {
          font-size: 0.8rem;
          color: #64748b;
        }
        .sk-search-results-count strong { color: #0f172a; }
        .sk-filter-tag {
          display: inline-block;
          background: #e0f2fe;
          color: #0369a1;
          padding: 0.1rem 0.5rem;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: capitalize;
          margin-left: 0.2rem;
        }

        .sk-badge-highlight {
          background: #0d9488 !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.2);
        }

        /* ── Toolbar Layout ── */
        .sk-capex-toolbar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        /* ── Date Range ── */
        .sk-date-range {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.3rem 0.6rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #f8fafc;
        }
        .sk-date-icon { color: #94a3b8; flex-shrink: 0; }
        .sk-date-input {
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 0.8rem;
          color: #334155;
          padding: 0.3rem 0.2rem;
          outline: none;
          width: 120px;
        }
        .sk-date-input:focus { color: #0f172a; }
        .sk-date-sep { color: #cbd5e1; font-size: 0.8rem; }

        /* ── Download Button ── */
        .sk-download-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 1rem;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          white-space: nowrap;
          letter-spacing: 0.02em;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
          margin-left: auto;
        }
        .sk-download-btn:hover {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3);
          transform: translateY(-1px);
        }
        .sk-download-btn:active { transform: translateY(0); }

        /* ── Sortable Column Headers ── */
        .sk-th-sortable {
          cursor: pointer;
          user-select: none;
          transition: color 0.15s;
        }
        .sk-th-sortable:hover { color: #0d9488; }
        .sk-sort-icon { opacity: 0.3; vertical-align: middle; margin-left: 2px; }
        .sk-sort-active { opacity: 1; color: #0d9488; vertical-align: middle; margin-left: 2px; }

        /* ── Totals Footer Row ── */
        .sk-totals-row td {
          background: #f0fdfa !important;
          border-top: 2px solid #0d9488;
          font-weight: 700 !important;
        }
        .sk-totals-label {
          font-size: 0.85rem;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 1rem 1.5rem !important;
        }
        .sk-totals-amount {
          font-family: 'Playfair Display', serif;
          font-size: 1.35rem;
          color: #0d9488;
          padding: 1rem 1.5rem !important;
        }

        /* Empty state */
        .sk-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem 0;
          color: #94a3b8;
        }
        .sk-empty-state p { margin-top: 1rem; font-size: 0.95rem; color: #64748b; }

        /* Modal / Forms */
        .sk-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: sk-fade-in 0.2s ease;
        }

        @keyframes sk-fade-in { from { opacity: 0; } to { opacity: 1; } }

        .sk-modal-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }

        .sk-modal-header {
          padding: 1.5rem 2rem;
          background: #fffbeb;
          border-bottom: 1px solid #fde68a;
        }

        .sk-modal-header-emerald {
          background: #f0fdfa;
          border-bottom-color: #a7f3d0;
        }

        .sk-modal-header h3 { margin: 0; color: #0f172a; font-size: 1.25rem; font-weight: 700; }
        .sk-modal-header p { margin: 0.25rem 0 0; color: #475569; font-size: 0.85rem; }
        .sk-modal-header strong { color: #0f172a; font-weight: 600; }

        .sk-form-grid {
          padding: 2rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          background: #ffffff;
        }

        .sk-input-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .sk-full-width { grid-column: 1 / -1; }

        .sk-input-group label {
          font-size: 0.8rem;
          color: #475569;
          font-weight: 600;
        }

        .sk-input-group input, .sk-input-group select {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 0.75rem 1rem;
          color: #0f172a;
          font-family: inherit;
          font-size: 0.9rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sk-input-group select { appearance: auto; } /* fix for light mode select */

        .sk-input-group input:focus, .sk-input-group select:focus {
          outline: none;
          border-color: #0d9488;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
        }

        .sk-modal-footer {
          padding: 1.5rem 2rem;
          background: #f8fafc;
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .sk-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .sk-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .sk-btn-ghost { background: transparent; color: #64748b; }
        .sk-btn-ghost:hover { color: #0f172a; background: #f1f5f9;}

        .sk-btn-gold { background: #d97706; color: #ffffff; }
        .sk-btn-gold:hover { background: #b45309; }

        .sk-btn-emerald { background: #0d9488; color: #ffffff; }
        .sk-btn-emerald:hover { background: #0f766e; }

        .sk-btn-slate { background: #0f172a; color: #ffffff; }
        .sk-btn-slate:hover { background: #1e293b; }

        /* ── Custom Category Picker ── */
        .sk-category-picker {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sk-new-category-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.65rem;
          background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%);
          border: 1px dashed #5eead4;
          border-radius: 8px;
          animation: skCatSlideIn 0.2s ease-out;
        }

        @keyframes skCatSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .sk-new-category-input-wrap {
          flex: 1;
        }

        .sk-new-category-input {
          width: 100%;
          background: #ffffff !important;
          border: 1px solid #a7f3d0 !important;
          border-radius: 6px !important;
          padding: 0.55rem 0.75rem !important;
          font-size: 0.85rem !important;
          color: #0f172a !important;
          font-family: inherit !important;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .sk-new-category-input:focus {
          outline: none !important;
          border-color: #0d9488 !important;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15) !important;
        }

        .sk-new-category-input::placeholder {
          color: #94a3b8;
          font-style: italic;
        }

        .sk-btn-add-cat {
          padding: 0.5rem 1rem;
          background: #0d9488;
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 700;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }
        .sk-btn-add-cat:hover { background: #0f766e; transform: scale(1.03); }

        .sk-btn-cancel-cat {
          padding: 0.4rem 0.6rem;
          background: transparent;
          color: #94a3b8;
          font-size: 0.95rem;
          font-weight: 400;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          line-height: 1;
        }
        .sk-btn-cancel-cat:hover { color: #ef4444; border-color: #fecaca; background: #fef2f2; }

        /* ── Actions Column ── */
        .sk-th-actions {
          text-align: center;
          width: 100px;
          min-width: 100px;
        }

        .sk-cell-actions {
          text-align: center;
          vertical-align: middle !important;
        }

        .sk-actions-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }

        .sk-row-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
        }

        .sk-row-edit {
          color: #0d9488;
        }
        .sk-row-edit:hover {
          background: #f0fdfa;
          border-color: #99f6e4;
          color: #0f766e;
        }

        .sk-row-delete {
          color: #94a3b8;
        }
        .sk-row-delete:hover {
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }

        /* ── Delete Confirmation Modal ── */
        .sk-delete-modal-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }

        .sk-delete-modal-header {
          padding: 2rem 2rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          text-align: center;
        }

        .sk-delete-icon-wrap {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #fef2f2;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #dc2626;
        }

        .sk-delete-modal-header h3 {
          margin: 0;
          color: #0f172a;
          font-size: 1.15rem;
          font-weight: 700;
        }

        .sk-delete-modal-header p {
          margin: 0;
          color: #64748b;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .sk-delete-modal-footer {
          padding: 1.25rem 2rem;
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          border-top: 1px solid #f1f5f9;
        }

        .sk-btn-danger {
          background: #dc2626;
          color: #ffffff;
        }
        .sk-btn-danger:hover {
          background: #b91c1c;
        }

        /* ── Investor Card Actions ── */
        .sk-investor-info-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .sk-investor-info-top h3 {
          flex: 1;
        }

        .sk-investor-actions {
          display: flex;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .sk-investor-card:hover .sk-investor-actions {
          opacity: 1;
        }

        /* ── Inflow Row Actions ── */
        .sk-inflow-actions {
          display: flex;
          gap: 0.15rem;
          margin-left: auto;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .sk-history-row:hover .sk-inflow-actions {
          opacity: 1;
        }

        .sk-row-action-sm {
          width: 26px !important;
          height: 26px !important;
        }
      `}</style>
        </div>
    )
}


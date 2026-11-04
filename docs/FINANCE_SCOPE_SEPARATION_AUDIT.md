# Finance Scope Separation Audit

## Decision

The application now treats **Hospital Finance** and **Pharmacy Finance** as two separate books:

- **Hospital Finance / Master Finance**: OPD, IPD, OT, laboratory, emergency, casualty, ambulance, canteen, hospital operating expenses, hospital cash/bank, hospital receivables and hospital suppliers.
- **Pharmacy Finance**: pharmacy POS sales, pharmacy credit customers, IPD medicine settlements, medicine purchases, pharmacy suppliers, pharmacy expenses, pharmacy cash/bank, stock value, pharmacy P&L and pharmacy GST.

The same PostgreSQL database may contain both books, but a page or server action must never use the other book's rows as its own data.

## Source-of-truth rules

| Area | Hospital Finance | Pharmacy Finance |
| --- | --- | --- |
| Cash and bank | `FinancialAccount.scope = HOSPITAL` and `Transaction.scope = HOSPITAL` | `FinancialAccount.scope = PHARMACY` and `Transaction.scope = PHARMACY` |
| Patient/customer billing | `Billing.type != PHARMACY` | `Billing.type = PHARMACY` |
| Purchases | Purchase invoices with no medicine line (`medicineId IS NULL`) | Purchase invoices with medicine lines (`medicineId IS NOT NULL`) |
| Revenue | Hospital billing and hospital collections | Pharmacy billing, returns, cost of goods sold and pharmacy collections |
| Internal movement | Never treated as revenue or expense | Internal transfers excluded from operating cash totals; hospital-to-pharmacy movement is an inter-department settlement |

## Workflow that should be followed

1. **Create the source document**: hospital bill, pharmacy sale, purchase invoice, return, expense request or IPD medicine dispense.
2. **Classify the document before posting**: its department/scope is determined from the source record, not from the screen filter.
3. **Post the accounting effect atomically**: update the source record, ledger transaction, account balance and audit log in one database transaction.
4. **Collect or settle**:
   - Hospital bills are collected in Hospital Finance.
   - Pharmacy OTC/credit sales are collected in Pharmacy Finance.
   - IPD medicine bills remain pharmacy receivables until the hospital-to-pharmacy settlement is posted.
5. **Handle corrections with reversals/returns**: posted bills and ledger entries should not be silently deleted after payment or settlement.
6. **Close the operating day**: pharmacy cash drawers require day close and variance recording; hospital cash/bank accounts require reconciliation.
7. **Review and report**: each P&L, GST, cash book, aging, invoice search and export must use the same scope predicate as the page it serves.

## Industry-standard controls required

- Separate chart-of-account scope and department/cost-center tagging.
- Role separation: pharmacist records pharmacy operations; accountant controls settlement, payables and financial review; administrator controls configuration and overrides.
- Maker-checker approval for refunds, supplier payments, write-offs, manual journals and cross-department transfers.
- Atomic balance decrements with an insufficient-balance guard.
- Immutable audit trail for creation, approval, settlement, correction and cancellation.
- No direct deletion of a posted/paid bill; use a credit note, refund, return or reversal.
- Daily cash close with counted cash, expected cash, variance reason and reviewer.
- Period/fiscal-year close so back-dated edits require controlled authorization.
- GST and statutory reports generated from source documents, not from cash movements alone.

## First separation pass completed

The following boundaries were enforced in the first pass:

- Master Finance account, ledger, day-book, cash-book, bank-book, trial balance, balance sheet, cash flow, GST, billing, receivables, invoice search and export queries are restricted to the hospital book.
- Pharmacy bills are blocked from hospital payment, refund, edit, delete and invoice-detail flows and are directed to Pharmacy Finance.
- Hospital billing pages and API exports exclude pharmacy bills.
- Hospital purchase and payable views exclude medicine purchase invoices; the existing purchase-return model is pharmacy-only and is hidden from Hospital Finance.
- P&L hospital scope is now exactly `HOSPITAL`; it no longer means “everything that is not pharmacy”.
- Mobile navigation no longer treats `/dashboard/pharmacy-finance` as a child of `/dashboard/pharmacy`.

## Remaining work before declaring the separation complete

1. Audit every remaining direct `prisma.billing`, `prisma.transaction`, `prisma.purchaseInvoice`, `prisma.supplierPayment` and report query outside the two finance modules.
2. Remove or redirect legacy duplicate finance pages under `/dashboard/finance` and `/dashboard/pharmacy/*` where the same invoice can still be opened from both departments.
3. Add a real hospital purchase-return model or explicitly keep returns pharmacy-only; do not reuse `PurchaseReturnItem`, which currently requires a medicine.
4. Add maker-checker workflows for refunds, manual vouchers, supplier payments, stock adjustments and inter-department settlements.
5. Add data migration/reconciliation checks for legacy rows with missing or incorrect `scope`, missing `accountGroupCode`, and mixed purchase invoices.
6. Add database-level constraints or triggers where practical so a future code path cannot create a pharmacy transaction on a hospital account or vice versa.
7. Add end-to-end tests for the critical guarantee: a pharmacy bill, pharmacy payment, pharmacy purchase, pharmacy supplier and pharmacy transaction never appear in any Hospital Finance list, total, export or report.

## Verification note

The new scope boundary has focused unit coverage in `__tests__/lib/finance-scope.test.ts`. The repository-wide lint, typecheck and test commands still expose pre-existing failures outside this change; those are recorded in the handoff summary rather than being suppressed.

"use client"

import { useState, useTransition, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  Ticket, Plus, Minus, ShoppingCart, IndianRupee, Loader2, CheckCircle2, Printer,
  Salad, Drumstick, Egg, Banknote, CreditCard, Smartphone, Trash2, Clock,
} from "lucide-react"
import { issueWalkInToken } from "@/lib/canteen-actions"

interface MenuItem {
  id: string; name: string; category: string; subCategory: string | null
  price: number; allergens: string | null; imageUrl: string | null
}

interface MealSlot {
  id: string; name: string; code: string; startTime: string; endTime: string
}

interface TokenItem {
  id: string; menuItemId: string; itemName: string; quantity: number
  unitPrice: number; totalPrice: number
}

interface Token {
  id: string; tokenNumber: string; customerName: string | null
  totalAmount: number; paymentMethod: string | null; status: string
  issuedAt: string; items: TokenItem[]
}

interface Props {
  menuItems: MenuItem[]
  mealSlots: MealSlot[]
  todayTokens: Token[]
  hospitalName: string
  hospitalAddress: string
  hospitalPhone: string
}

interface CartItem {
  menuItemId: string; name: string; category: string; price: number; quantity: number
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  VEG: <Salad className="h-3.5 w-3.5 text-green-600" />,
  NON_VEG: <Drumstick className="h-3.5 w-3.5 text-red-600" />,
  EGG: <Egg className="h-3.5 w-3.5 text-amber-600" />,
}

const STATUS_COLORS: Record<string, string> = {
  ISSUED: "bg-blue-100 text-blue-700",
  PREPARING: "bg-amber-100 text-amber-700",
  READY: "bg-green-100 text-green-700",
  SERVED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-100 text-red-700",
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "UPI", label: "UPI", icon: Smartphone },
  { value: "CARD", label: "Card", icon: CreditCard },
]

export function TokenCounterClient({ menuItems, mealSlots, todayTokens, hospitalName, hospitalAddress, hospitalPhone }: Props) {
  const [isPending, startTransition] = useTransition()
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [lastToken, setLastToken] = useState<{ tokenNumber: string; totalAmount: number; customerName: string; items: CartItem[] } | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>("ALL")
  const printRef = useRef<HTMLDivElement>(null)

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id)
      if (existing) {
        return prev.map((c) => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { menuItemId: item.id, name: item.name, category: item.category, price: item.price, quantity: 1 }]
    })
  }

  function updateQuantity(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c)
        .filter((c) => c.quantity > 0)
    )
  }

  function clearCart() {
    setCart([])
    setCustomerName("")
  }

  function handleIssueToken() {
    if (cart.length === 0) { toast.error("Cart is empty"); return }
    const savedCart = [...cart]
    const savedName = customerName
    startTransition(async () => {
      const result = await issueWalkInToken({
        customerName: customerName || undefined,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          itemName: c.name,
          quantity: c.quantity,
          unitPrice: c.price,
        })),
        paymentMethod,
      })

      if (result.success) {
        setLastToken({
          tokenNumber: result.tokenNumber!,
          totalAmount: cartTotal,
          customerName: savedName || "Walk-in",
          items: savedCart,
        })
        setShowSuccessDialog(true)
        clearCart()
      } else toast.error(result.error || "Failed to issue token")
    })
  }

  function handlePrintAndClose() {
    if (!lastToken) { setShowSuccessDialog(false); return }

    const now = new Date()
    const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })

    const dash = "─".repeat(32)
    const doubleDash = "═".repeat(32)

    const itemRows = lastToken.items.map((item) => {
      const nameQty = `${item.name} x${item.quantity}`
      const amt = `Rs.${(item.price * item.quantity).toFixed(0)}`
      return `<tr><td>${nameQty}</td><td style="text-align:right">${amt}</td></tr>`
    }).join("")

    const receiptHTML = `<!DOCTYPE html>
<html>
<head>
  <title>Token ${lastToken.tokenNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    @media print { html, body { width: 80mm; margin: 0; padding: 0; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', 'Lucida Console', monospace;
      width: 80mm; max-width: 80mm;
      margin: 0 auto; padding: 4mm 3mm;
      font-size: 12px; line-height: 1.4; color: #000;
    }
    .c { text-align: center; }
    .r { text-align: right; }
    .b { font-weight: bold; }
    .big { font-size: 28px; letter-spacing: 3px; }
    .med { font-size: 14px; }
    .xs { font-size: 9px; color: #444; }
    .sep { text-align: center; color: #999; font-size: 11px; margin: 4px 0; letter-spacing: -1px; }
    .sep-b { text-align: center; font-size: 11px; margin: 4px 0; letter-spacing: -1px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 2px 0; font-size: 11px; vertical-align: top; }
    .total td { padding-top: 4px; font-size: 16px; font-weight: bold; }
    .mt { margin-top: 6px; }
    .mb { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="c b med mb">${hospitalName.toUpperCase()}</div>
  <div class="c xs">${hospitalAddress}</div>
  <div class="c xs mb">Ph: ${hospitalPhone}</div>
  <div class="sep-b">${doubleDash}</div>
  <div class="c b med">CANTEEN TOKEN</div>
  <div class="sep">${dash}</div>
  <div class="c b big mt mb">${lastToken.tokenNumber}</div>
  <table>
    <tr><td class="b">Name:</td><td class="r">${lastToken.customerName}</td></tr>
    <tr><td>Date:</td><td class="r">${dateStr}</td></tr>
    <tr><td>Time:</td><td class="r">${timeStr}</td></tr>
    <tr><td>Payment:</td><td class="r">${paymentMethod}</td></tr>
  </table>
  <div class="sep">${dash}</div>
  <table><tr class="b"><td>Item</td><td class="r">Amt</td></tr></table>
  <div class="sep">${dash}</div>
  <table>${itemRows}</table>
  <div class="sep-b">${doubleDash}</div>
  <table><tr class="total"><td>TOTAL</td><td class="r">Rs.${lastToken.totalAmount.toFixed(0)}</td></tr></table>
  <div class="sep-b">${doubleDash}</div>
  <div class="c xs mt">Thank you! Collect your order</div>
  <div class="c xs">when your token is called.</div>
  <div class="c xs" style="margin-top:8px">*** Have a nice day! ***</div>
  <div style="border-bottom:1px dashed #aaa;margin:10px 0"></div>
</body>
</html>`

    const printWindow = window.open("", "_blank", "width=350,height=600")
    if (printWindow) {
      printWindow.document.write(receiptHTML)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        setTimeout(() => { try { printWindow.close() } catch {} }, 1000)
      }, 300)
    }
    setShowSuccessDialog(false)
  }

  const filteredItems = filterCategory === "ALL"
    ? menuItems
    : menuItems.filter((m) => m.category === filterCategory)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg">
          <Ticket className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Token Counter</h1>
          <p className="text-sm text-gray-500">Issue walk-in canteen tokens (POS)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Menu Items Grid */}
        <div className="lg:col-span-2 space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {["ALL", "VEG", "NON_VEG", "EGG"].map((cat) => (
              <Button
                key={cat}
                variant={filterCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory(cat)}
                className={filterCategory === cat ? "bg-violet-600 hover:bg-violet-700" : ""}
              >
                {cat === "ALL" ? "All" : cat === "NON_VEG" ? "Non-Veg" : cat}
              </Button>
            ))}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.map((item) => {
              const inCart = cart.find((c) => c.menuItemId === item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`relative p-3 rounded-xl border text-left transition-all hover:shadow-md active:scale-[0.98] ${
                    inCart
                      ? "border-violet-300 bg-violet-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-violet-200"
                  }`}
                >
                  {item.imageUrl && (
                    <div className="w-full h-24 mb-2 rounded-lg overflow-hidden bg-gray-100">
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-semibold text-gray-900 truncate">{item.name}</span>
                  </div>
                  {item.subCategory && (
                    <p className="text-[10px] text-gray-400 mb-1">{item.subCategory}</p>
                  )}
                  <p className="text-sm font-bold text-emerald-600">₹{item.price}</p>
                  {inCart && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold shadow-lg">
                      {inCart.quantity}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Cart & Checkout + Today's Tokens */}
        <div className="space-y-4 min-w-0">
          <Card className="border-0 shadow-lg sticky top-4 overflow-hidden rounded-xl p-0 gap-0">
            <CardHeader className="py-4 px-5 bg-gradient-to-r from-violet-600 to-purple-600 text-white m-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShoppingCart className="h-5 w-5" />
                Order ({cart.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 bg-white">
              {/* Customer Name */}
              <div className="space-y-1">
                <Label htmlFor="customerName" className="text-xs">Customer Name (Optional)</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Visitor name"
                  className="h-9"
                />
              </div>

              {/* Cart Items */}
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tap items to add</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.menuItemId} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {CATEGORY_ICONS[item.category]}
                        <span className="text-xs font-medium truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.menuItemId, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.menuItemId, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-semibold text-emerald-600 w-12 text-right">
                          ₹{(item.price * item.quantity).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <>
                  <Separator />
                  {/* Total */}
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span className="text-emerald-600 flex items-center">
                      <IndianRupee className="h-5 w-5" />{cartTotal.toFixed(0)}
                    </span>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label className="text-xs">Payment Method</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map((pm) => (
                        <Button
                          key={pm.value}
                          variant={paymentMethod === pm.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPaymentMethod(pm.value)}
                          className={`text-xs ${paymentMethod === pm.value ? "bg-violet-600" : ""}`}
                        >
                          <pm.icon className="h-3.5 w-3.5 mr-1" /> {pm.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={clearCart}>
                      <Trash2 className="h-4 w-4 mr-1" /> Clear
                    </Button>
                    <Button
                      className="flex-1 bg-violet-600 hover:bg-violet-700"
                      onClick={handleIssueToken}
                      disabled={isPending || cart.length === 0}
                    >
                      {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ticket className="h-4 w-4 mr-2" />}
                      Issue Token
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Today's Tokens — Simple list: token#, customer, items */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                Today&apos;s Tokens ({todayTokens.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayTokens.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No tokens issued today</p>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto">
                  {todayTokens.slice(0, 30).map((token) => (
                    <div key={token.id} className="bg-gray-50 rounded-lg p-3">
                      {/* Token Header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-violet-700">{token.tokenNumber}</span>
                          <Badge className={`text-[10px] ${STATUS_COLORS[token.status]}`}>{token.status}</Badge>
                        </div>
                        <span className="text-sm font-bold text-emerald-600">₹{token.totalAmount}</span>
                      </div>

                      {/* Customer Name */}
                      <p className="text-xs text-gray-600 font-medium mb-1.5">
                        {token.customerName || "Walk-in"} •{" "}
                        <span className="text-gray-400">
                          {new Date(token.issuedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </p>

                      {/* Items List */}
                      {token.items.length > 0 && (
                        <div className="border-t border-gray-200 pt-1.5 space-y-0.5">
                          {token.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-xs text-gray-500">
                              <span>{item.itemName} × {item.quantity}</span>
                              <span>₹{item.totalPrice}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Dialog — Print-ready */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Token Issued!</DialogTitle>
            <DialogDescription className="text-center">
              Show this token number to the customer
            </DialogDescription>
          </DialogHeader>
          {lastToken && (
            <div className="space-y-4 my-4" ref={printRef}>
              <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-6 text-center">
                <p className="text-4xl font-black text-violet-700 tracking-wider">{lastToken.tokenNumber}</p>
                <p className="text-sm text-gray-600 mt-1">{lastToken.customerName}</p>
                <p className="text-lg font-bold text-gray-700 mt-2">₹{lastToken.totalAmount.toFixed(0)}</p>
              </div>

              {/* Items Summary in Dialog */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                {lastToken.items.map((item) => (
                  <div key={item.menuItemId} className="flex justify-between text-xs text-gray-600">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">₹{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={handlePrintAndClose}>
                  <Printer className="h-4 w-4 mr-2" /> Print Token
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => setShowSuccessDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

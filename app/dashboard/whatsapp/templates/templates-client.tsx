"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, MessageSquarePlus } from "lucide-react"
import { createLocalTemplate, deleteLocalTemplate } from "@/lib/actions/whatsapp-marketing"
import { toast } from "sonner"

type Template = {
  id: string
  name: string
  language: string
  category: string
  body: string
  status: string
  createdAt: string
}

export function TemplatesClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [isAdding, setIsAdding] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    language: "en",
    category: "MARKETING" as "MARKETING" | "UTILITY" | "AUTHENTICATION",
    body: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const res = await createLocalTemplate(formData)
    if (res.success && res.data) {
      toast.success(res.message)
      const newTemplate = {
        ...res.data,
        createdAt: res.data.createdAt.toISOString(),
      }
      setTemplates([newTemplate, ...templates])
      setIsAdding(false)
      setFormData({ name: "", language: "en", category: "MARKETING", body: "" })
    } else {
      toast.error(res.message)
    }
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template tracking record?")) return
    const res = await deleteLocalTemplate(id)
    if (res.success) {
      setTemplates(templates.filter((t) => t.id !== id))
      toast.success("Template deleted")
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage your approved Meta WhatsApp templates.
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? "Cancel" : <><Plus className="mr-2 h-4 w-4" /> Track New Template</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="border-green-100 bg-green-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-green-600" />
              Add Template to Tracking System
            </CardTitle>
            <CardDescription>
              Note: This only tracks the template in the ERP. You must still create and get it approved in the Meta Business Manager. Ensure the name matches exactly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Template Name (Meta ID)</Label>
                  <Input 
                    required 
                    placeholder="e.g. summer_promo_2026" 
                    value={formData.name}
                    onChange={(e) => {
                      // Only allow a-z, 0-9, and underscores. No spaces, no regional characters.
                      const cleanName = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                      setFormData({ ...formData, name: cleanName })
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Must strictly match the alphanumeric name in your Meta dashboard.</p>
                </div>
                <div className="space-y-2">
                  <Label>Language Code</Label>
                  <Select value={formData.language} onValueChange={(v: string) => setFormData({ ...formData, language: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (en)</SelectItem>
                      <SelectItem value="hi">Hindi (hi)</SelectItem>
                      <SelectItem value="or">Odia (or)</SelectItem>
                      <SelectItem value="bn">Bengali (bn)</SelectItem>
                      <SelectItem value="te">Telugu (te)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v: any) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="UTILITY">Utility</SelectItem>
                      <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Template Body</Label>
                <Textarea 
                  required 
                  placeholder="Hello {{1}}, we have a special offer for you..." 
                  className="min-h-[100px]"
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Template Record"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No templates tracked yet.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.category === "MARKETING" ? "border-purple-200 text-purple-700 bg-purple-50" : ""}>
                        {t.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.language}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {t.body}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
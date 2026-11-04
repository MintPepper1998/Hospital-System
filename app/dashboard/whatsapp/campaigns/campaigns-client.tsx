"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Send, Users, Pencil, Trash2, MoreHorizontal } from "lucide-react"
import { sendBulkCampaign, addMarketingContact, editMarketingContact, deleteMarketingContact } from "@/lib/actions/whatsapp-marketing"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

type AudienceMember = {
  id: string
  name: string
  phone: string
  type: string
}

type Template = {
  id: string
  name: string
  language: string
  category: string
  body: string
}

export function CampaignsClient({ audience, templates }: { audience: AudienceMember[], templates: Template[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [isSending, setIsSending] = useState(false)
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [newContact, setNewContact] = useState({ name: "", phone: "", tags: "" })
  const [editingContact, setEditingContact] = useState<AudienceMember | null>(null)
  const [editForm, setEditForm] = useState({ name: "", phone: "" })
  const [deletingContact, setDeletingContact] = useState<AudienceMember | null>(null)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(audience.map(a => a.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedIds(newSet)
  }

  const handleSendCampaign = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one contact.")
      return
    }
    if (!selectedTemplate) {
      toast.error("Please select a template to send.")
      return
    }

    const template = templates.find(t => t.id === selectedTemplate)
    if (!template) return

    const selectedContacts = audience
      .filter(a => selectedIds.has(a.id))
      .map(a => ({ phone: a.phone, name: a.name }))

    if (!confirm(`Are you sure you want to send this template to ${selectedContacts.length} contacts?`)) return

    setIsSending(true)
    const res = await sendBulkCampaign({
      templateName: template.name,
      language: template.language,
      category: template.category as any,
      contacts: selectedContacts,
    })

    if (res.success) {
      toast.success(res.message)
      setSelectedIds(new Set())
    } else {
      toast.error(res.message)
    }
    setIsSending(false)
  }

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await addMarketingContact(newContact)
    if (res.success) {
      toast.success(res.message)
      setIsAddingContact(false)
      setNewContact({ name: "", phone: "", tags: "" })
    } else {
      toast.error(res.message)
    }
  }

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingContact) return
    const res = await editMarketingContact(editingContact.id, editForm)
    if (res.success) {
      toast.success(res.message)
      setEditingContact(null)
    } else {
      toast.error(res.message)
    }
  }

  const handleDeleteContact = async () => {
    if (!deletingContact) return
    const res = await deleteMarketingContact(deletingContact.id)
    if (res.success) {
      toast.success(res.message)
      selectedIds.delete(deletingContact.id)
      setSelectedIds(new Set(selectedIds))
      setDeletingContact(null)
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select contacts and send bulk marketing messages using approved templates.
          </p>
        </div>
        <Dialog open={isAddingContact} onOpenChange={setIsAddingContact}>
          <DialogTrigger asChild>
            <Button variant="outline"><Users className="mr-2 h-4 w-4" /> Add Marketing Contact</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
              <DialogDescription>Add a phone number to your marketing audience.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddContact} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name (Optional)</Label>
                <Input value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input required value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="10-digit number" />
              </div>
              <DialogFooter>
                <Button type="submit">Save Contact</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle className="text-lg">Audience ({audience.length} total)</CardTitle>
                <CardDescription>{selectedIds.size} selected</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white shadow-sm z-10">
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox 
                          checked={selectedIds.size === audience.length && audience.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[60px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audience.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedIds.has(person.id)}
                            onCheckedChange={(c) => handleSelectOne(person.id, c as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell>{person.phone}</TableCell>
                        <TableCell>
                          <Badge variant={person.type === "PATIENT" ? "default" : "secondary"}>
                            {person.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {person.type === "CONTACT" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditForm({ name: person.name, phone: person.phone })
                                  setEditingContact(person)
                                }}>
                                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => setDeletingContact(person)}>
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {audience.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                          No audience members found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-600" />
                Send Campaign
              </CardTitle>
              <CardDescription>
                Send a message to {selectedIds.size} selected contacts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.language})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div className="p-3 bg-muted rounded-md text-xs text-muted-foreground border">
                  <strong>Preview:</strong><br />
                  {templates.find(t => t.id === selectedTemplate)?.body}
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={handleSendCampaign}
                disabled={isSending || selectedIds.size === 0 || !selectedTemplate}
              >
                {isSending ? "Sending..." : "Send Campaign Now"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ Edit Contact Dialog ═══ */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update the contact&apos;s name or phone number.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditContact} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Contact name" />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input required value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="10-digit number" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingContact(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Contact Confirmation ═══ */}
      <AlertDialog open={!!deletingContact} onOpenChange={(open) => !open && setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingContact?.name}</strong> ({deletingContact?.phone})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteContact} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Upload, FileText, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { updatePatientDetails, addPatientDocument, deletePatientDocument } from "@/app/actions/patient-management"
import { getPresignedUrl } from "@/app/actions/upload"

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  aadharNumber: z.string().optional(),
})

interface EditPatientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patientId: string
  initialData: any
}

export function EditPatientDialog({
  open,
  onOpenChange,
  patientId,
  initialData,
}: EditPatientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(initialData?.user?.image || null)
  const [uploadedDocs, setUploadedDocs] = useState<any[]>(initialData?.documents || [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.user?.name === "Unknown Patient" ? "" : initialData?.user?.name || "",
      dateOfBirth: initialData?.dateOfBirth ? new Date(initialData.dateOfBirth).toISOString().split("T")[0] : "",
      gender: initialData?.gender || "",
      bloodGroup: initialData?.bloodGroup || "",
      phone: initialData?.phone || initialData?.user?.phone || "",
      emergencyContact: initialData?.emergencyContact || "",
      address: initialData?.address || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      pincode: initialData?.pincode || "",
      aadharNumber: initialData?.aadharNumber || "",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      const res = await updatePatientDetails({
        patientId,
        ...values,
        image: profileImage,
      })

      if (!res.success) throw new Error(res.message)
      
      toast.success("Patient details updated successfully")
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Failed to update details")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const { url, publicUrl } = await getPresignedUrl(file.name, file.type, "profile-photos")
      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!uploadRes.ok) throw new Error("Upload failed")
      
      setProfileImage(publicUrl)
      toast.success("Profile photo uploaded")
    } catch (error) {
      console.error(error)
      toast.error("Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDoc(true)
    try {
      const { url, publicUrl } = await getPresignedUrl(file.name, file.type, "documents")
      const uploadRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      if (!uploadRes.ok) throw new Error("Upload failed")
      
      const res = await addPatientDocument({
        patientId,
        title: file.name,
        fileUrl: publicUrl,
        fileType: file.type,
      })

      if (res.success && res.data) {
        setUploadedDocs([...uploadedDocs, res.data])
        toast.success("Document uploaded")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to upload document")
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleRemoveImage = () => {
    setProfileImage(null)
  }

  const handleRemoveDocument = async (idx: number) => {
    const docToRemove = uploadedDocs[idx]
    
    // Optimistic UI update
    const newDocs = [...uploadedDocs]
    newDocs.splice(idx, 1)
    setUploadedDocs(newDocs)

    // If the document has an ID, it means it's saved in the database
    if (docToRemove.id) {
      try {
        const res = await deletePatientDocument(docToRemove.id, patientId)
        if (res.success) {
          toast.success("Document deleted")
        } else {
          // Revert optimistic update on failure
          setUploadedDocs(uploadedDocs)
          toast.error(res.message || "Failed to delete document")
        }
      } catch (error) {
        setUploadedDocs(uploadedDocs)
        toast.error("Failed to delete document")
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Patient Details</DialogTitle>
          <DialogDescription>
            Update identity and demographic details for this patient.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="demographics" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="contact">Contact & Address</TabsTrigger>
            <TabsTrigger value="media">Media & Documents</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
              
              {/* DEMOGRAPHICS */}
              <TabsContent value="demographics" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="MALE">Male</SelectItem>
                            <SelectItem value="FEMALE">Female</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bloodGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Group</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Blood Group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="A+">A+</SelectItem>
                            <SelectItem value="A-">A-</SelectItem>
                            <SelectItem value="B+">B+</SelectItem>
                            <SelectItem value="B-">B-</SelectItem>
                            <SelectItem value="AB+">AB+</SelectItem>
                            <SelectItem value="AB-">AB-</SelectItem>
                            <SelectItem value="O+">O+</SelectItem>
                            <SelectItem value="O-">O-</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* CONTACT */}
              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="9876543210" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact</FormLabel>
                        <FormControl>
                          <Input placeholder="9876543211" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="aadharNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aadhaar Number</FormLabel>
                        <FormControl>
                          <Input placeholder="1234 5678 9012" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-4 pt-2">
                  <h4 className="text-sm font-medium">Address Information</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="City" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="State" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pincode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pincode</FormLabel>
                          <FormControl>
                            <Input placeholder="123456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* MEDIA */}
              <TabsContent value="media" className="space-y-6">
                
                {/* Profile Image Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Profile Picture</h4>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="h-24 w-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 relative group">
                      {profileImage ? (
                        <>
                          {/* We use next/image to handle domains if configured, but fall back to standard img if not */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={`/api/documents/view?fileUrl=${encodeURIComponent(profileImage)}`}
                            alt="Profile" 
                            className="h-full w-full object-cover" 
                            onError={(e) => {
                              // If image fails to load (e.g. 403 Forbidden on S3 without public read), show a fallback
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement?.classList.add('broken-img');
                            }}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 transition-opacity">
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="text-white hover:text-red-400 p-1 bg-black/40 rounded-full"
                              title="Delete Image"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <Upload className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 w-full">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="max-w-xs"
                      />
                      {profileImage && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Upload a new image to replace, or hover over the image to delete.
                        </p>
                      )}
                      {uploadingImage && <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Uploading...</p>}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4"></div>

                {/* Documents Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Patient Documents</h4>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleDocumentUpload}
                      disabled={uploadingDoc}
                      className="max-w-xs"
                    />
                    {uploadingDoc && <span className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Uploading...</span>}
                  </div>
                  
                  {uploadedDocs.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {uploadedDocs.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                            <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                            <div className="min-w-0 overflow-hidden">
                              <p className="text-sm font-medium truncate" title={doc.title}>{doc.title}</p>
                              <p className="text-xs text-muted-foreground">Uploaded just now</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button variant="ghost" size="sm" type="button" onClick={() => window.open(doc.fileUrl, "_blank")}>
                              View
                            </Button>
                            <Button variant="ghost" size="sm" type="button" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveDocument(idx)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="mr-2"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Details
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

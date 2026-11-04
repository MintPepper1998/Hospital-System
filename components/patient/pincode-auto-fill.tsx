"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, MapPin } from "lucide-react"

interface PincodeAutoFillProps {
  values?: {
    pincode?: string
    city?: string
    state?: string
    address?: string
  }
  onChange?: (field: string, value: string) => void
}

export function PincodeAutoFill({ values, onChange }: PincodeAutoFillProps) {
  const [internalPincode, setInternalPincode] = useState("")
  const [internalCity, setInternalCity] = useState("")
  const [internalStateName, setInternalStateName] = useState("")
  const [internalAddress, setInternalAddress] = useState("")
  
  const [localities, setLocalities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Use props if provided, otherwise internal state
  const pincode = values?.pincode ?? internalPincode
  const city = values?.city ?? internalCity
  const stateName = values?.state ?? internalStateName
  const address = values?.address ?? internalAddress

  const handleUpdate = (field: string, value: string) => {
    if (onChange) {
      onChange(field, value)
    } else {
      if (field === "pincode") setInternalPincode(value)
      if (field === "city") setInternalCity(value)
      if (field === "state") setInternalStateName(value)
      if (field === "address") setInternalAddress(value)
    }
  }
  
  useEffect(() => {
    if (pincode?.length === 6) {
      const fetchDetails = async () => {
        setIsLoading(true)
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
          const data = await res.json()
          
          if (data && data[0] && data[0].Status === "Success") {
             const postOffices = data[0].PostOffice
             handleUpdate("state", postOffices[0].State)
             handleUpdate("city", postOffices[0].District)
             
             const locs = postOffices.map((po: any) => po.Name)
             setLocalities([...new Set(locs)] as string[])
          } else {
             setLocalities([])
          }
        } catch (e) {
          console.error(e)
          setLocalities([])
        } finally {
          setIsLoading(false)
        }
      }
      fetchDetails()
    } else {
      setLocalities([])
    }
  }, [pincode])

  return (
    <>
      <div className="space-y-2 relative">
        <Label htmlFor="pincode" className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-blue-500" /> Pincode
        </Label>
        <div className="relative">
          <Input 
            id="pincode" 
            name="pincode" 
            placeholder="6-digit PIN" 
            maxLength={6} 
            value={pincode || ""}
            onChange={(e) => handleUpdate("pincode", e.target.value.replace(/[^0-9]/g, ""))}
            className={pincode?.length === 6 && localities.length > 0 ? "border-green-500 bg-green-50" : ""}
          />
          {isLoading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-blue-500" />}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Locality / Village</Label>
        <Select 
          disabled={localities.length === 0}
          onValueChange={(val) => handleUpdate("address", address ? `${address}, ${val}` : val)}
        >
          <SelectTrigger className={localities.length > 0 ? "border-blue-300 bg-blue-50" : ""}>
            <SelectValue placeholder={localities.length > 0 ? "Select Area..." : "Enter PIN first"} />
          </SelectTrigger>
          <SelectContent>
            {localities.map((loc) => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">City / District</Label>
        <Input 
          id="city" 
          name="city" 
          placeholder="City" 
          value={city || ""} 
          onChange={e => handleUpdate("city", e.target.value)} 
          className={city ? "bg-gray-50 opacity-80" : ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">State</Label>
        <Input 
          id="state" 
          name="state" 
          placeholder="State" 
          value={stateName || ""} 
          onChange={e => handleUpdate("state", e.target.value)} 
          className={stateName ? "bg-gray-50 opacity-80" : ""}
        />
      </div>

      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="address">Full Address <span className="text-red-500">*</span></Label>
        <Input 
          id="address" 
          name="address" 
          placeholder="House No, Street, Locality" 
          value={address || ""} 
          onChange={e => handleUpdate("address", e.target.value)} 
          required 
        />
      </div>
    </>
  )
}


"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { FlaskConical, Loader2, ScanLine } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { collectSample } from "@/lib/actions"
import { collectIPDSample } from "@/app/actions/lab"

interface CollectSampleButtonProps {
  requestId: string
  testName: string
  buttonText?: string
  isRadiology?: boolean
  isIPD?: boolean
}

export function CollectSampleButton({ 
  requestId, 
  testName,
  buttonText,
  isRadiology = false,
  isIPD = false,
}: CollectSampleButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleCollect = () => {
    startTransition(async () => {
      const result = isIPD
        ? await collectIPDSample(requestId)
        : await collectSample(requestId)
      
      if (result.success) {
        toast.success(isRadiology 
          ? `Scan marked as completed for ${testName}` 
          : `Sample collected for ${testName}`
        )
        router.refresh()
      } else {
        toast.error(result.message || "Failed to update status")
      }
    })
  }

  return (
    <Button
      size="sm"
      onClick={handleCollect}
      disabled={isPending}
      className={isRadiology 
        ? "bg-purple-600 hover:bg-purple-700" 
        : "bg-blue-600 hover:bg-blue-700"
      }
    >
      {isPending ? (
        <>
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          {isRadiology ? (
            <ScanLine className="mr-1 h-3 w-3" />
          ) : (
            <FlaskConical className="mr-1 h-3 w-3" />
          )}
          {buttonText || (isRadiology ? "Mark Scan Done" : "Collect Sample")}
        </>
      )}
    </Button>
  )
}

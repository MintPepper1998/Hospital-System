"use client"

import { useState, useTransition } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { TheaterDialog } from "./theater-dialog"
import { deleteOperationTheater } from "@/lib/actions"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Theater {
  id: string
  name: string
  type: string
  isOperational: boolean
  surgeries?: any[]
}

interface TheaterTableProps {
  theaters: Theater[]
}

export function TheaterTable({ theaters }: TheaterTableProps) {
  const [isPending, startTransition] = useTransition()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [theaterToDelete, setTheaterToDelete] = useState<Theater | null>(null)
  const [editTheater, setEditTheater] = useState<Theater | null>(null)

  const handleDelete = (theater: Theater) => {
    setTheaterToDelete(theater)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!theaterToDelete) return

    startTransition(async () => {
      try {
        const result = await deleteOperationTheater(theaterToDelete.id)
        
        if (result.success) {
          toast.success(result.message || "Theater deleted successfully")
          setDeleteDialogOpen(false)
          setTheaterToDelete(null)
        } else {
          toast.error(result.message || "Failed to delete theater")
        }
      } catch (error: any) {
        toast.error(error.message || "An error occurred")
      }
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "MAJOR":
        return "bg-red-500/10 text-red-500 dark:bg-red-500/20"
      case "MINOR":
        return "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20"
      case "EMERGENCY":
        return "bg-orange-500/10 text-orange-500 dark:bg-orange-500/20"
      case "CARDIAC":
        return "bg-purple-500/10 text-purple-500 dark:bg-purple-500/20"
      case "NEURO":
        return "bg-cyan-500/10 text-cyan-500 dark:bg-cyan-500/20"
      case "ORTHOPEDIC":
        return "bg-green-500/10 text-green-500 dark:bg-green-500/20"
      default:
        return "bg-gray-500/10 text-gray-500 dark:bg-gray-500/20"
    }
  }

  if (theaters.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-semibold">No theaters yet</h3>
        <p className="text-muted-foreground mt-2">Get started by creating your first operation theater.</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Theater Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {theaters.map((theater) => (
            <TableRow key={theater.id}>
              <TableCell className="font-medium">{theater.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className={getTypeColor(theater.type)}>
                  {theater.type}
                </Badge>
              </TableCell>
              <TableCell>
                {theater.isOperational ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 dark:bg-green-500/20">
                    Operational
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 dark:bg-yellow-500/20">
                    Maintenance
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setEditTheater(theater)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(theater)}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      {editTheater && (
        <TheaterDialog
          theater={editTheater}
          trigger={<span />}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the theater <strong>{theaterToDelete?.name}</strong>.
              This action cannot be undone. Make sure there are no active or scheduled surgeries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTheaterToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? "Deleting..." : "Delete Theater"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function Building2({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  )
}

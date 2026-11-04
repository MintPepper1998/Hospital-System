"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { Bell, Search, PlusCircle, BedDouble, Receipt, Save, Info, AlertTriangle, XCircle, CheckCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { signOut } from "next-auth/react"
import { Settings, User, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { getDashboardNotifications, markNotificationAsRead, markAllNotificationsAsRead, NotificationItem } from "@/lib/actions/notifications"
import { UpdateSoftwareButton } from "@/components/layout/update-software-button"
import { AnimatedThemeSwitch } from "@/components/animated-theme-switch"

interface DashboardHeaderProps {
  userName: string
  userEmail: string
  userRole?: string
  userImage?: string | null
}

export function DashboardHeader({ userName, userEmail, userRole, userImage }: DashboardHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const query = useSearchParams()
  const [searchText, setSearchText] = useState(query.get("q") || "")
  const debouncedSearch = useDebounce(searchText.trim(), 500)
  const [savedViews, setSavedViews] = useState<Array<{ name: string; url: string }>>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const storageKey = useMemo(
    () => `saved-filter-views:${userEmail}`,
    [userEmail]
  )

  useEffect(() => {
    // Fetch notifications
    const fetchNotifications = async () => {
      try {
        const data = await getDashboardNotifications()
        setNotifications(data)
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      }
    }
    
    fetchNotifications()
    // Poll every 2 minutes
    const intervalId = setInterval(fetchNotifications, 120000)
    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const existing = localStorage.getItem(storageKey)
    if (existing) {
      try {
        setSavedViews(JSON.parse(existing))
      } catch {
        setSavedViews([])
      }
    }
  }, [storageKey])

  const handleSaveView = () => {
    const name = window.prompt("Save current view as:")
    if (!name) return
    const url = `${pathname}${query.toString() ? `?${query.toString()}` : ""}`
    const next = [{ name, url }, ...savedViews].slice(0, 10)
    setSavedViews(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/dashboard/search?q=${encodeURIComponent(searchText.trim())}`)
  }

  // Auto-navigate when debounced search value changes
  useEffect(() => {
    if (debouncedSearch && debouncedSearch.length >= 2) {
      router.push(`/dashboard/search?q=${encodeURIComponent(debouncedSearch)}`)
    }
  }, [debouncedSearch, router])

  const firstName = userName.split(" ")[0]

  return (
    <header className="sticky top-0 z-40 bg-transparent pt-2">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        
        {/* Left - Search Bar */}
        <div className="hidden flex-1 items-center justify-start md:flex w-full">
          <form onSubmit={handleGlobalSearch} className="relative w-full max-w-xl flex items-center h-11 border border-slate-200/60 shadow-sm rounded-full px-4 overflow-hidden bg-white hover:shadow-md transition-shadow duration-300">
            <Search className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
            <input
              placeholder="Global search... (⌘K)"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-foreground font-semibold placeholder:text-muted-foreground text-sm h-full"
            />
          </form>
        </div>

        {/* Right - Profile & Actions */}
        <div className="flex items-center gap-4 pr-2 ml-auto">
          
          {/* Update Software Button (Tauri only) */}
          <UpdateSoftwareButton />

          {/* Notification Bell */}
          <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <PopoverTrigger asChild>
              <button suppressHydrationWarning className="relative text-muted-foreground hover:text-foreground transition-colors ml-2 focus:outline-none p-2 rounded-full border border-border shadow-sm bg-card active:scale-95">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-destructive flex items-center justify-center">
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0 overflow-hidden shadow-xl border-slate-200 rounded-xl">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                  {notifications.some(n => n.isPersistent) && (
                    <button
                      onClick={async () => {
                        await markAllNotificationsAsRead()
                        setNotifications(prev => prev.filter(n => !n.isPersistent))
                      }}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[380px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center justify-center text-slate-500">
                    <CheckCircle className="h-10 w-10 text-emerald-300 mb-3" />
                    <p className="text-sm font-medium">You're all caught up!</p>
                    <p className="text-[11px] text-slate-400 mt-1">No pending tasks or new events.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={`px-4 py-3 cursor-pointer transition-all duration-150 hover:bg-blue-50/50 ${notif.isPersistent ? 'bg-white' : 'bg-slate-50/40'}`}
                        onClick={async () => {
                          if (notif.isPersistent) {
                            await markNotificationAsRead(notif.id)
                            setNotifications(prev => prev.filter(n => n.id !== notif.id))
                          }
                          setIsNotificationsOpen(false)
                          router.push(notif.link)
                        }}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 flex items-center justify-center ${
                            notif.type === 'ERROR' ? 'bg-red-100 text-red-600' :
                            notif.type === 'WARNING' ? 'bg-amber-100 text-amber-600' :
                            notif.type === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {notif.type === 'ERROR' ? <XCircle className="h-3.5 w-3.5" /> :
                             notif.type === 'WARNING' ? <AlertTriangle className="h-3.5 w-3.5" /> :
                             notif.type === 'SUCCESS' ? <CheckCircle className="h-3.5 w-3.5" /> :
                             <Info className="h-3.5 w-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[13px] font-semibold text-slate-800 leading-none">{notif.title}</h4>
                              {notif.isPersistent && (
                                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"></span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug mt-1.5 line-clamp-2">{notif.message}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {notif.module && (
                                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{notif.module}</span>
                              )}
                              {notif.createdByName && (
                                <span className="text-[10px] text-slate-400">by {notif.createdByName}</span>
                              )}
                              {notif.isPersistent && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(notif.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {notifications.length > 0 && (
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2 border-t border-slate-200 text-center">
                  <span className="text-[11px] text-slate-400 font-medium">Click to view details · Event notifications auto-dismiss on read</span>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button suppressHydrationWarning className="flex items-center gap-3 ml-2 outline-none p-1.5 rounded-full border border-border shadow-sm bg-card active:scale-95 transition-transform">
                <div className="hidden flex-col items-end md:flex pl-2 -space-y-0.5">
                  <span className="text-[13px] font-bold text-foreground">{firstName}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold capitalize">{userRole?.toLowerCase().replace('_', ' ') || "Hospital Admin"}</span>
                </div>
                
                <div className="relative">
                  <Avatar className="h-[38px] w-[38px] rounded-full overflow-hidden bg-card p-0.5">
                    <AvatarImage src={userImage || ""} alt={userName} className="rounded-full object-cover h-full w-full" />
                    <AvatarFallback className="rounded-full bg-muted text-muted-foreground text-xs font-semibold h-full w-full flex items-center justify-center">
                      {userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Green status dot */}
                  <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-[2.5px] border-card bg-emerald-500 z-10"></span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={userRole === "PHARMACIST" ? "/dashboard/pharmacy/settings" : "/dashboard/admin/users"} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AnimatedThemeSwitch />
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

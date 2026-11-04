"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, User, Search, Paperclip, Check, CheckCheck } from "lucide-react"
import { getConversationMessages, sendInboxMessage } from "@/lib/actions/whatsapp-inbox"
import { format } from "date-fns"

type Conversation = {
  id: string
  phone: string
  status: string
  patientName: string
  lastMessage: string
  lastMessageTime: string
}

type Message = {
  id: string
  direction: string
  type: string
  content: string
  status: string
  createdAt: string
}

export function InboxClient({ initialConversations }: { initialConversations: Conversation[] }) {
  const [conversations, setConversations] = useState(initialConversations)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [replyText, setReplyText] = useState("")
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const activeConversation = conversations.find(c => c.id === activeConversationId)
  
  const filteredConversations = conversations.filter(c => 
    c.phone.includes(searchTerm) || c.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId)
    }
  }, [activeConversationId])

  const loadMessages = async (id: string) => {
    setIsLoadingMessages(true)
    const res = await getConversationMessages(id)
    if (res.success && res.data) {
      setMessages(res.data)
    }
    setIsLoadingMessages(false)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !activeConversationId) return

    setIsSending(true)
    const res = await sendInboxMessage(activeConversationId, replyText)
    if (res.success && res.data) {
      setMessages([...messages, res.data])
      setReplyText("")
      
      // Update last message in conversation list
      setConversations(conversations.map(c => 
        c.id === activeConversationId 
          ? { ...c, lastMessage: res.data.content, lastMessageTime: res.data.createdAt }
          : c
      ))
    }
    setIsSending(false)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 overflow-hidden">
      {/* Sidebar - Conversation List */}
      <Card className="w-1/3 flex flex-col overflow-hidden">
        <div className="p-4 border-b space-y-4">
          <h2 className="font-semibold text-lg">Inbox</h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search patients or phone..." 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No conversations found.
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredConversations.map(conv => (
                <div 
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 ${activeConversationId === conv.id ? "bg-slate-100" : ""}`}
                >
                  <Avatar>
                    <AvatarFallback className="bg-green-100 text-green-700">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm truncate">{conv.patientName !== "Unknown Patient" ? conv.patientName : conv.phone}</h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {format(new Date(conv.lastMessageTime), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {conv.lastMessage}
                    </p>
                    {conv.status === "BOT_HANDLING" && (
                      <Badge variant="secondary" className="mt-2 text-[10px] py-0">Bot Active</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-green-100 text-green-700">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{activeConversation.patientName}</h3>
                  <p className="text-xs text-muted-foreground">{activeConversation.phone}</p>
                </div>
              </div>
              <Badge variant={activeConversation.status === "OPEN" ? "default" : "secondary"}>
                {activeConversation.status}
              </Badge>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4 bg-[#E5DDD5]">
              {isLoadingMessages ? (
                <div className="text-center text-muted-foreground p-4">Loading messages...</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map(msg => {
                    const isOutbound = msg.direction === "OUTBOUND"
                    return (
                      <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] rounded-lg p-3 shadow-sm relative ${isOutbound ? "bg-[#dcf8c6] rounded-tr-none" : "bg-white rounded-tl-none"}`}>
                          <p className="text-sm break-words">{msg.content}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-gray-500">
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </span>
                            {isOutbound && (
                              <span className="text-blue-500">
                                {msg.status === "READ" ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3 text-gray-400" />}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {messages.length === 0 && (
                    <div className="text-center bg-[#fff8db] text-[#8e845f] text-xs p-2 rounded-lg mx-auto my-4 max-w-sm">
                      Messages to this chat and calls are now secured with end-to-end encryption.
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 bg-slate-100 border-t">
              <form onSubmit={handleSend} className="flex gap-2 items-end">
                <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Input 
                  placeholder="Type a message..." 
                  className="flex-1 rounded-full bg-white border-none shadow-sm h-12"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  disabled={isSending}
                />
                <Button 
                  type="submit" 
                  disabled={!replyText.trim() || isSending}
                  className="shrink-0 h-12 w-12 rounded-full bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50 flex-col gap-4">
            <div className="h-24 w-24 rounded-full bg-green-100 flex items-center justify-center">
              <Send className="h-10 w-10 text-green-600 ml-1" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-slate-700">WhatsApp for Web</h2>
              <p className="text-slate-500 mt-2 max-w-md">Send and receive messages without leaving the hospital ERP. Select a conversation to start chatting.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

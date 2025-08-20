'use client'

/**
 * ChatWindow
 * ----------
 * The main conversation surface for a selected Room.
 * Responsibilities:
 * - Render a header with room title and type.
 * - Display a scrollable list of messages (local state mock for now).
 * - Show typing indicators and basic file placeholders.
 * - Provide a composer for sending messages and attaching files.
 * Integration points (TODO):
 * - Subscribe to Phoenix Channel for the room to receive messages & typing events.
 * - Post new messages to the backend API and upload attachments to Blob Storage.
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Send, Paperclip, MoreVertical, Phone, Video, Info, Search, Smile, FileText, Image as ImageIcon, Download, Eye } from 'lucide-react'
import type { Room, User } from '@/types'
import { usePhoenix } from '@/lib/phoenix/context'

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: string
  type: 'text' | 'file' | 'image' | 'system'
  fileUrl?: string
  fileName?: string
  fileSize?: number
  edited?: boolean
  isOwn: boolean
}

// Note: Using shared User type from '@/types'

interface ChatWindowProps {
  room: Room
  user?: User | null
  className?: string
}

export function ChatWindow({ room, user, className }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const { joinRoom, leaveRoom, push } = usePhoenix()
  const topic = `room:${room.id}`

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Join/leave Phoenix channel for the current room
  useEffect(() => {
    const ch = joinRoom(topic, { org_id: room.orgId })
    if (!ch) return

    // Message history on join
    ch.on('message_history', (payload: any) => {
      const list = Array.isArray(payload?.messages) ? payload.messages : []
      const mapped: Message[] = list.map((p: any) => ({
        id: p.id ?? String(Date.now()),
        content: p.content ?? '',
        senderId: p.user_id ?? p.senderId,
        senderName: p.user_name ?? p.senderName ?? 'User',
        timestamp: p.timestamp ?? new Date().toISOString(),
        type: p.type ?? 'text',
        fileUrl: p.file_url,
        fileName: p.file_name,
        fileSize: p.file_size,
        edited: Boolean(p.edited_at),
        isOwn: (p.user_id ?? p.senderId) === (user as any)?.id,
      }))
      setMessages(mapped)
    })

    // Incoming message event from backend
    ch.on('new_message', (payload: any) => {
      // Expecting shape compatible with Message; adjust mapping as needed
      const incoming: Message = {
        id: payload.id ?? String(Date.now()),
        content: payload.content ?? '',
        senderId: payload.user_id ?? payload.senderId,
        senderName: payload.user_name ?? payload.senderName ?? 'User',
        timestamp: payload.timestamp ?? new Date().toISOString(),
        type: payload.type ?? 'text',
        fileUrl: payload.file_url,
        fileName: payload.file_name,
        fileSize: payload.file_size,
        edited: Boolean(payload.edited_at),
        isOwn: payload.user_id === (user as any)?.id,
      }
      setMessages((prev) => [...prev, incoming])
    })

    // Typing status from others
    ch.on('user_typing', (payload: any) => {
      const name = payload.user_name || payload.user_id || 'Someone'
      if (payload.typing) {
        setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]))
      } else {
        setTypingUsers((prev) => prev.filter((n) => n !== name))
      }
    })

    return () => {
      // Leave channel when the room changes/unmounts
      leaveRoom(topic)
      setTypingUsers([])
    }
  }, [topic, room.orgId])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const msg: Message = {
        id: String(Date.now()),
        content: newMessage.trim(),
        senderId: user?.id as any,
        senderName: (user as any)?.name || 'You',
        timestamp: new Date().toLocaleTimeString(),
        type: 'text',
        isOwn: true,
      }
      setMessages((m) => [...m, msg])
      setNewMessage('')
      handleTypingStop()

  // Push to server channel (backend expects 'new_message')
  push(topic, 'new_message', {
        content: msg.content,
        type: msg.type,
        org_id: (room as any).orgId,
        room_id: room.id,
        user_id: (user as any)?.id,
      })
    }
  }

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true)
      // Notify channel: typing started
      push(topic, 'typing', { user_id: (user as any)?.id, typing: true })
    }
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop()
    }, 3000)
  }

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false)
      // Notify channel: typing stopped
      push(topic, 'typing', { user_id: (user as any)?.id, typing: false })
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    } else {
      handleTypingStart()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
  // push file upload flow here
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderMessage = (message: Message) => {
  const isOwnMessage = message.senderId === (user as any)?.id
    
    return (
      <div
        key={message.id}
        className={cn(
          "flex gap-3 p-3 hover:bg-slate-50 group",
          isOwnMessage && "justify-end"
        )}
      >
        {!isOwnMessage && (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {message.senderName.charAt(0).toUpperCase()}
          </div>
        )}
        
        <div className={cn(
          "flex flex-col max-w-[70%]",
          isOwnMessage && "items-end"
        )}>
          {!isOwnMessage && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-slate-900">
                {message.senderName}
              </span>
              <span className="text-xs text-slate-500">
                {message.timestamp}
              </span>
            </div>
          )}
          
          <div className={cn(
            "rounded-lg px-3 py-2 text-sm",
            isOwnMessage 
              ? "bg-blue-600 text-white" 
              : "bg-white border border-slate-200",
            message.type === 'system' && "bg-slate-100 text-slate-600 italic"
          )}>
            {message.type === 'text' && (
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            )}
            
            {message.type === 'file' && (
              <div className="flex items-center gap-3 p-2 border border-slate-200 rounded bg-slate-50">
                <FileText className="h-8 w-8 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {message.fileName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {message.fileSize && formatFileSize(message.fileSize)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {message.type === 'image' && (
              <div className="space-y-2">
                <img 
                  src={message.fileUrl} 
                  alt={message.fileName}
                  className="max-w-full h-auto rounded"
                />
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-500">
                    {message.fileName}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {isOwnMessage && (
            <span className="text-xs text-slate-500 mt-1">
              {message.timestamp}
              {message.edited && <span className="ml-1">(edited)</span>}
            </span>
          )}
        </div>
        
        {isOwnMessage && (
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            You
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {room.name}
                </h2>
                <Badge variant={room.type === 'private' ? 'secondary' : 'default'}>
                  {room.type}
            </Badge>
          </div>
          <span className="text-sm text-slate-500">
            {(room as any).participants || 0} members
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Info className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-0">
        <div className="space-y-1">
          {messages.map(renderMessage)}
          
          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex gap-3 p-3 text-sm text-slate-500 italic">
              <div className="w-8 h-8" /> {/* Spacer */}
              <div>
                {typingUsers.length === 1 ? (
                  <span>{typingUsers[0]} is typing...</span>
                ) : (
                  <span>{typingUsers.join(', ')} are typing...</span>
                )}
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <Separator />

      {/* Message Input */}
      <div className="p-4">
        <div className="flex items-end gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message #${room.name.toLowerCase()}`}
              className="w-full min-h-[40px] max-h-32 px-3 py-2 text-sm border border-slate-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
            />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
          >
            <Smile className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

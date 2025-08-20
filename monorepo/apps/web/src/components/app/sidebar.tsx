'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Search, Hash, Lock } from 'lucide-react'
import type { Room, User } from '@/types'

type SidebarProps = {
  rooms: Room[]
  selectedRoom: Room | null
  onRoomSelectAction: (room: Room) => void
  user?: User | null
  className?: string
}

/**
 * Sidebar
 * -------
 * Left-hand room selector with search and unread badges.
 * - Filters rooms by name via a simple client-side search.
 * - Highlights the currently selected room.
 * - Uses onRoomSelectAction (function name ends with Action to satisfy Next.js client rules).
 */
export function Sidebar({ rooms, selectedRoom, onRoomSelectAction, className }: SidebarProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () => rooms.filter(r => r.name.toLowerCase().includes(query.toLowerCase())),
    [rooms, query]
  )

  return (
    <div className={cn('flex h-full flex-col bg-slate-50', className)}>
      <div className="p-4 border-b border-slate-200">
        <div className="text-lg font-semibold">Rooms</div>
        <div className="mt-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms..."
            className="w-full pl-9 pr-3 py-2 rounded-md border text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {filtered.map((room) => (
            <button
              key={room.id}
              onClick={() => onRoomSelectAction(room)}
              className={cn(
                'w-full text-left rounded-md px-3 py-2 hover:bg-slate-100 flex items-center gap-2',
                selectedRoom?.id === room.id && 'bg-blue-50 hover:bg-blue-50'
              )}
            >
              {room.type === 'private' ? (
                <Lock className="h-4 w-4 text-slate-400" />
              ) : (
                <Hash className="h-4 w-4 text-slate-400" />
              )}
              <span className="truncate text-sm font-medium">{room.name}</span>
              {!!(room as any).unreadCount && (
                <Badge className="ml-auto text-[10px]" variant="default">{(room as any).unreadCount}</Badge>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-xs text-slate-500 px-3 py-6 text-center">No rooms</div>
          )}
        </div>
      </ScrollArea>

      <Separator />
      <div className="p-3 text-xs text-slate-500">{rooms.length} total</div>
    </div>
  )
}

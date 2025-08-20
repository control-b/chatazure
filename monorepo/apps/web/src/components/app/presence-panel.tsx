'use client'

/**
 * PresencePanel
 * -------------
 * Shows a filterable list of online users, lightweight team stats, and quick actions.
 * Props:
 * - onlineUsers: currently online users (filtered by server presence).
 * - selectedRoom: the active room (reserved for future contextual actions).
 * - currentUserId: optional; highlights "You" in the list.
 * - onUserSelect/onInviteUser: optional callbacks for interactions.
 * Notes:
 * - User.status comes from our shared type: 'active' | 'inactive'. We map these to colors.
 * - Extend this to show roles, truck locations, etc., once backend feeds are wired.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Crown, 
  Shield, 
  Truck, 
  User as UserIcon,
  MoreVertical,
  MessageSquare,
  Phone,
  Video,
  UserPlus,
  Settings
} from 'lucide-react'
import type { User, Room } from '@/types'

interface PresencePanelProps {
  onlineUsers: User[]
  selectedRoom: Room | null
  currentUserId?: string
  onUserSelect?: (userId: string) => void
  onInviteUser?: () => void
  className?: string
}

const roleIcons = {
  owner: Crown,
  dispatcher: Shield,
  driver: Truck,
  clerk: UserIcon
}

const roleColors = {
  owner: 'text-yellow-600',
  dispatcher: 'text-blue-600',
  driver: 'text-green-600',
  clerk: 'text-gray-600'
}

const statusColors = {
  active: 'bg-green-500',
  inactive: 'bg-gray-400',
} as const

export function PresencePanel({
  onlineUsers,
  selectedRoom,
  currentUserId,
  onUserSelect,
  onInviteUser,
  className
}: PresencePanelProps) {
  const [filter, setFilter] = useState<'all' | 'online' | 'drivers'>('all')

  const filteredUsers = onlineUsers.filter(user => {
    switch (filter) {
      case 'online':
    return user.status === 'active'
      case 'drivers':
        return user.role === 'driver'
      default:
        return true
    }
  })

  const driverUsers = onlineUsers.filter(user => user.role === 'driver')

  const renderUser = (user: User) => {
  const RoleIcon = roleIcons[user.role]
  const isCurrentUser = currentUserId ? user.id === currentUserId : false
    
    return (
      <div
        key={user.id}
        className={cn(
          "flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer rounded-md group",
          isCurrentUser && "bg-blue-50"
        )}
  onClick={() => onUserSelect?.(user.id)}
      >
        {/* Avatar with status */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div 
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
              statusColors[user.status]
            )}
          />
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900 truncate">
              {user.name}
              {isCurrentUser && <span className="text-slate-500"> (You)</span>}
            </span>
            <RoleIcon className={cn("h-4 w-4", roleColors[user.role])} />
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500 capitalize">
              {user.status}
            </span>
            {user.status === 'inactive' && user.lastSeenAt && (
              <>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-400">{String(user.lastSeenAt)}</span>
              </>
            )}
          </div>

        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isCurrentUser && (
            <>
              <Button variant="ghost" size="sm">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Phone className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex flex-col h-full bg-slate-50 border-l border-slate-200",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Team Members
          </h2>
          <Button size="sm" onClick={() => onInviteUser?.()}>
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>{onlineUsers.length} online</span>
          </div>
          <div className="flex items-center gap-1">
            <Truck className="h-3 w-3" />
            <span>{driverUsers.length} drivers</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({onlineUsers.length})
          </Button>
          <Button
            variant={filter === 'online' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('online')}
          >
            Online ({onlineUsers.length})
          </Button>
          <Button
            variant={filter === 'drivers' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('drivers')}
          >
            Drivers ({driverUsers.length})
          </Button>
        </div>
      </div>

      {/* User List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-1">
          {filteredUsers.length > 0 ? (
            filteredUsers.map(renderUser)
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm">No users found</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer */}
      <div className="p-4">
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Settings className="h-4 w-4 mr-2" />
          Manage Team
        </Button>
      </div>
    </div>
  )
}

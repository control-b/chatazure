'use client'

import { useSession } from 'next-auth/react'
import { redirect, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/app/sidebar'
import { ChatWindow } from '@/components/app/chat-window'
import { PresencePanel } from '@/components/app/presence-panel'
import { usePhoenix } from '@/lib/phoenix/context'
import { GeoEventFeed } from '@/components/app/geo-event-feed'
import { Room, User } from '@/types'

export default function AppPage() {
  const { data: session, status } = useSession()
  const { socket, isConnected } = usePhoenix()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])
  const search = useSearchParams()
  const demoMode = search.get('demo') === '1'

  useEffect(() => {
    if (status === 'unauthenticated' && !demoMode) {
      redirect('/signin')
    }
  }, [status, demoMode])

  useEffect(() => {
    if (demoMode) {
      const demoRooms: Room[] = [
        { id: 'general', name: 'general', type: 'public', orgId: 'demo' } as any,
        { id: 'ops', name: 'operations', type: 'public', orgId: 'demo' } as any,
        { id: 'dispatch', name: 'dispatch', type: 'private', orgId: 'demo' } as any,
      ]
      setRooms(demoRooms)
      setSelectedRoom(demoRooms[0])
      setOnlineUsers([
        { id: 'u1', name: 'Alex Owner', role: 'owner', status: 'active' } as any,
        { id: 'u2', name: 'Dana Dispatcher', role: 'dispatcher', status: 'active' } as any,
        { id: 'u3', name: 'Chris Driver', role: 'driver', status: 'inactive' } as any,
      ])
      return
    }
    if (session?.user && isConnected && socket) {
      // Fetch user's rooms
      fetchRooms()
    }
  }, [session, isConnected, socket, demoMode])

  const fetchRooms = async () => {
    try {
      const orgId = (session as any).user?.orgId as string
      const accessToken = (session as any).accessToken as string
      const response = await fetch(`/api/phoenix/orgs/${orgId}/rooms`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })
      if (response.ok) {
        const roomsData = await response.json()
        setRooms(roomsData)
        if (roomsData.length > 0 && !selectedRoom) {
          setSelectedRoom(roomsData[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    }
  }

  if (!demoMode && status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!demoMode && !session) {
    return null
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar - Rooms List */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 border-b border-gray-200 flex items-center px-4">
          <h1 className="text-xl font-semibold text-gray-900">ChatDO</h1>
        </div>
        <Sidebar
          rooms={rooms}
          selectedRoom={selectedRoom}
          onRoomSelectAction={setSelectedRoom}
          user={(session as any)?.user || (demoMode ? ({ id: 'u1', name: 'Demo User', role: 'owner', status: 'active' } as any) : undefined)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <ChatWindow
            room={selectedRoom}
            user={(session as any)?.user || (demoMode ? ({ id: 'u1', name: 'Demo User', role: 'owner', status: 'active' } as any) : undefined)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-600 mb-2">
                Welcome to TruckingPlatform
              </h2>
              <p className="text-gray-500">
                Select a room from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Presence and Geo Event Feed */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <div className="flex-1">
          <PresencePanel
            selectedRoom={selectedRoom}
            onlineUsers={onlineUsers as any}
            currentUserId={(session as any)?.user?.id || 'u1'}
          />
        </div>
        {selectedRoom && (
          <div className="h-64 border-t">
            <GeoEventFeed room={selectedRoom} />
          </div>
        )}
      </div>
    </div>
  )
}

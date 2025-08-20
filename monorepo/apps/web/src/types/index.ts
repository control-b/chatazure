export interface User {
  id: string
  name: string
  email: string
  role: 'owner' | 'dispatcher' | 'driver' | 'clerk'
  orgId: string
  avatarUrl?: string
  status: 'active' | 'inactive'
  lastSeenAt?: Date
}

export interface Room {
  id: string
  name: string
  description?: string
  type: 'general' | 'dispatch' | 'trip' | 'private'
  orgId: string
  members: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  roomId: string
  userId: string
  orgId: string
  content: string
  type: 'text' | 'file' | 'image' | 'system' | 'geo_event' | 'signature_request'
  attachments: Attachment[]
  replyTo?: string
  editedAt?: Date
  timestamp: Date
  metadata?: Record<string, any>
}

export interface Attachment {
  id: string
  name: string
  blobName: string
  size: number
  contentType: string
  uploadUrl: string
}

export interface GeoEvent {
  id: string
  geofenceId: string
  userId: string
  orgId: string
  eventType: 'enter' | 'exit'
  location: {
    lat: number
    lon: number
  }
  timestamp: Date
  metadata?: Record<string, any>
}

export interface Geofence {
  id: string
  name: string
  description?: string
  orgId: string
  coordinates: [number, number][]
  type: 'facility' | 'pickup' | 'delivery' | 'rest_area'
  createdAt: Date
  updatedAt: Date
}

export interface Doc {
  id: string
  title: string
  content?: string
  roomId?: string
  orgId: string
  createdBy: string
  collaborators: string[]
  status: 'draft' | 'review' | 'signed' | 'archived'
  signatures: Signature[]
  createdAt: Date
  updatedAt: Date
}

export interface Signature {
  id: string
  userId: string
  signatureData: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface Presence {
  userId: string
  user: User
  onlineAt: string
  roomId?: string
}

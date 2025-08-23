export interface User {
  id: string;
  name: string;
  email: string;
  role: "owner" | "dispatcher" | "driver" | "clerk" | "admin";
  orgId: string;
  avatarUrl?: string;
  status: "active" | "inactive";
  lastSeenAt?: Date;
  phone?: string;
  vehicleId?: string; // For driver role
  tenantId: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  type: "general" | "dispatch" | "trip" | "private";
  orgId: string;
  tenantId: string;
  members: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tripId?: string; // For trip-specific channels
  autoCreated?: boolean; // For auto-created channels from geofence check-ins
  assignedDoor?: string; // Door assignment for logistics
}

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  orgId: string;
  content: string;
  type:
    | "text"
    | "file"
    | "image"
    | "system"
    | "geo_event"
    | "signature_request";
  attachments: Attachment[];
  replyTo?: string;
  editedAt?: Date;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Attachment {
  id: string;
  name: string;
  blobName: string;
  size: number;
  contentType: string;
  uploadUrl: string;
}

export interface GeoEvent {
  id: string;
  geofenceId: string;
  userId: string;
  orgId: string;
  eventType: "enter" | "exit";
  location: {
    lat: number;
    lon: number;
  };
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  orgId: string;
  coordinates: [number, number][];
  type: "facility" | "pickup" | "delivery" | "rest_area";
  createdAt: Date;
  updatedAt: Date;
}

export interface Doc {
  id: string;
  title: string;
  content?: string;
  roomId?: string;
  orgId: string;
  createdBy: string;
  collaborators: string[];
  status: "draft" | "review" | "signed" | "archived";
  signatures: Signature[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Signature {
  id: string;
  userId: string;
  signatureData: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Presence {
  userId: string;
  user: User;
  onlineAt: string;
  roomId?: string;
}

// Enhanced Trip Management Types
export interface Trip {
  id: string;
  tenantId: string;
  poNumber: string;
  driverId: string;
  driver: User;
  pickupLocation: Location;
  destinationLocation: Location;
  vehicle: Vehicle;
  status: 'created' | 'in_transit' | 'arrived_pickup' | 'arrived_destination' | 'completed' | 'cancelled';
  assignedDoor?: string;
  channelId?: string;
  checkIns: CheckIn[];
  documents: TripDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  lat: number;
  lng: number;
  name: string;
  address?: string;
  geofenceRadius?: number; // meters
}

export interface Vehicle {
  truckNumber: string;
  trailerNumber?: string;
  type: 'truck' | 'van' | 'trailer';
}

export interface CheckIn {
  id: string;
  tripId: string;
  type: 'pickup' | 'delivery';
  lat: number;
  lng: number;
  method: 'auto' | 'manual';
  distanceMeters: number;
  timestamp: Date;
  deviceId?: string;
  userId: string;
}

// Enhanced Document Types
export interface TripDocument {
  id: string;
  tripId: string;
  channelId?: string;
  title: string;
  type: 'BOL' | 'POD' | 'LOA' | 'INVOICE' | 'OTHER';
  blobUrl: string;
  status: 'uploaded' | 'pending_signature' | 'signed' | 'declined';
  sha256: string;
  version: number;
  fields: SignatureField[];
  signers: DocumentSigner[];
  auditTrail: SignatureAudit[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignatureField {
  id: string;
  type: 'signature' | 'initial' | 'date' | 'text' | 'checkbox';
  page: number;
  x: number; // PDF points (1/72 inch)
  y: number;
  width: number;
  height: number;
  required: boolean;
  assigneeUserId?: string;
  value?: string;
  placeholder?: string;
}

export interface DocumentSigner {
  id: string;
  documentId: string;
  userId: string;
  user: User;
  status: 'invited' | 'viewed' | 'signed' | 'declined';
  signedAt?: Date;
  declineReason?: string;
  signatureData?: string; // Base64 encoded signature image
  ipAddress?: string;
  userAgent?: string;
  location?: { lat: number; lng: number };
}

export interface SignatureAudit {
  id: string;
  documentId: string;
  userId: string;
  action: 'created' | 'viewed' | 'signed' | 'declined' | 'field_added' | 'field_removed';
  hashBefore?: string;
  hashAfter?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: { lat: number; lng: number };
  timestamp: Date;
}

// Geofence Check-in Response
export interface CheckInResponse {
  checkinId: string;
  distanceM: number;
  accepted: boolean;
  message?: string;
}

// Enhanced Message Types for Trip Context
export interface TripMessage extends Message {
  tripId?: string;
  doorAssignment?: string;
  documentRequest?: {
    documentType: string;
    templateId?: string;
    requiredSigners: string[];
  };
}

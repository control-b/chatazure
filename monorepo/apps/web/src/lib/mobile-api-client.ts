// Mobile API client for connecting Next.js frontend to Phoenix backend

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface MobileDashboardData {
  stats: {
    today_trips: number;
    completed_trips: number;
    pending_documents: number;
    unread_messages: number;
  };
  notifications: Notification[];
  location_status: {
    permission_granted: boolean;
    geofence_monitoring: any;
    last_update: string;
  };
  timestamp: string;
}

export interface Trip {
  id: string;
  poNumber: string;
  driverName: string;
  driverPhone: string;
  truckNumber: string;
  trailerNumber?: string;
  pickupLocation: Location;
  deliveryLocation: Location;
  status: string;
  geofences: Geofence[];
  checkins: CheckIn[];
  next_checkin_type?: string;
}

export interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface Geofence {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  radius: number;
  trip_id: string;
}

export interface CheckIn {
  id: string;
  type: 'pickup' | 'delivery';
  timestamp: string;
  location: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  method: 'auto' | 'manual';
  distance: number;
  photos?: string[];
  notes?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  timestamp: string;
  read: boolean;
  urgent?: boolean;
  data?: any;
}

export interface DocumentSignature {
  signature_svg?: string;
  signature_base64?: string;
  field_id: string;
  location: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  };
  device_info: {
    platform: string;
    model: string;
    version: string;
  };
}

class MobileApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private socket: WebSocket | null = null;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor(baseUrl: string) {
    // Normalize base URL and remove trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  // Authentication
  setToken(token: string) {
    this.token = token;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (!this.token && typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
  const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Dashboard APIs
  async getDashboard(userId: string, orgId: string): Promise<ApiResponse<MobileDashboardData>> {
    return this.request(`/api/mobile/dashboard/${userId}?orgId=${orgId}`);
  }

  // Trip APIs
  async getActiveTrip(userId: string, orgId: string): Promise<ApiResponse<{ active_trip: Trip | null }>> {
    return this.request(`/api/mobile/trips/active/${userId}?orgId=${orgId}`);
  }

  async createTrip(tripData: any): Promise<ApiResponse<Trip>> {
  return this.request('/api/mobile/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    });
  }

  // Location and Geofencing APIs
  async updateLocation(locationData: {
    user_id: string;
    org_id: string;
    lat: number;
    lon: number;
    accuracy?: number;
    timestamp: string;
  }): Promise<ApiResponse<{ events: any[]; geofence_events: number }>> {
  return this.request('/api/mobile/location', {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  }

  async getTripGeofences(userId: string, orgId: string): Promise<ApiResponse<{ geofences: Geofence[] }>> {
  return this.request(`/api/mobile/geofences/${userId}?orgId=${orgId}`);
  }

  async manualGeofenceCheckin(checkinData: {
    user_id: string;
    org_id: string;
    trip_id: string;
    type: string;
    lat: number;
    lon: number;
    notes?: string;
  }): Promise<ApiResponse<any>> {
  return this.request('/api/mobile/checkin/manual', {
      method: 'POST',
      body: JSON.stringify(checkinData),
    });
  }

  // Check-in APIs
  async mobileCheckin(checkinData: {
    orgId: string;
    tripId: string;
    driverId: string;
    type: string;
    location: {
      lat: number;
      lng: number;
      accuracy: number;
    };
    method?: string;
    notes?: string;
    photos?: string[];
  }): Promise<ApiResponse<any>> {
  return this.request('/api/mobile/checkins', {
      method: 'POST',
      body: JSON.stringify(checkinData),
    });
  }

  async getCheckinStatus(tripId: string, userId: string): Promise<ApiResponse<any>> {
  return this.request(`/api/mobile/checkins/status/${tripId}/${userId}`);
  }

  // Notification APIs
  async getNotifications(
    userId: string,
    orgId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ApiResponse<{ notifications: Notification[]; has_more: boolean }>> {
    return this.request(
      `/api/mobile/notifications/${userId}?orgId=${orgId}&limit=${limit}&offset=${offset}`
    );
  }

  async markNotificationsRead(notificationIds: string[], userId: string): Promise<ApiResponse<any>> {
  return this.request('/api/mobile/notifications/read', {
      method: 'POST',
      body: JSON.stringify({
        notification_ids: notificationIds,
        userId,
      }),
    });
  }

  // Device Registration
  async registerDevice(deviceData: {
    user_id: string;
    org_id: string;
    platform: string;
    device_token: string;
    model?: string;
    version?: string;
  }): Promise<ApiResponse<{ device_id: string; push_enabled: boolean }>> {
  return this.request('/api/mobile/devices/register', {
      method: 'POST',
      body: JSON.stringify(deviceData),
    });
  }

  // Document APIs
  async getDocuments(
    userId: string,
    orgId: string,
    status?: string,
    tripId?: string
  ): Promise<ApiResponse<{ documents: any[] }>> {
    const params = new URLSearchParams({ orgId });
    if (status) params.append('status', status);
    if (tripId) params.append('tripId', tripId);
    
  return this.request(`/api/mobile/documents/${userId}?${params}`);
  }

  async getDocument(documentId: string, userId: string): Promise<ApiResponse<any>> {
  return this.request(`/api/mobile/documents/${documentId}/view/${userId}`);
  }

  async signDocument(
    documentId: string,
    signatureData: DocumentSignature
  ): Promise<ApiResponse<any>> {
  return this.request(`/api/mobile/documents/${documentId}/sign`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: signatureData.field_id, // This should be the actual user_id
        document_id: documentId,
        signature_data: signatureData,
        location: signatureData.location,
        device_info: signatureData.device_info,
      }),
    });
  }

  async uploadSignature(signatureData: string, metadata: any): Promise<ApiResponse<any>> {
  return this.request('/api/mobile/documents/signature/upload', {
      method: 'POST',
      body: JSON.stringify({
        signature_data: signatureData,
        ...metadata,
      }),
    });
  }

  async getDocumentDownloadUrl(documentId: string, userId: string): Promise<ApiResponse<any>> {
  return this.request(`/api/mobile/documents/${documentId}/download/${userId}`);
  }

  async getSignatureFields(documentId: string, userId: string): Promise<ApiResponse<any>> {
  return this.request(`/api/mobile/documents/${documentId}/fields/${userId}`);
  }

  async batchSignDocuments(signatures: any[]): Promise<ApiResponse<any>> {
  return this.request('/api/mobile/documents/batch_sign', {
      method: 'POST',
      body: JSON.stringify({ signatures }),
    });
  }

  async getDocumentAuditTrail(documentId: string, userId: string): Promise<ApiResponse<any>> {
  return this.request(`/api/mobile/documents/${documentId}/audit/${userId}`);
  }

  // Real-time WebSocket connection
  connectSocket(userId: string, orgId: string): WebSocket {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    // Always connect sockets to Phoenix, not the Next.js origin.
    // Read from NEXT_PUBLIC_PHOENIX_WS_URL (e.g., ws://localhost:4000/socket)
    const phoenixWsBase =
      (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_PHOENIX_WS_URL) ||
      'ws://localhost:4000/socket';

    const base = phoenixWsBase.replace(/\/$/, '');
    const wsUrl = `${base}/websocket?token=${encodeURIComponent(token)}`;
    
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      
      // Join mobile channel
      this.sendMessage('phx_join', {
        topic: `mobile:user:${userId}`,
        payload: { org_id: orgId },
        ref: Date.now().toString()
      });
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => this.connectSocket(userId, orgId), 3000);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return this.socket;
  }

  private sendMessage(event: string, data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify([null, null, data.topic, event, data.payload]));
    }
  }

  private handleMessage(message: any): void {
    if (Array.isArray(message) && message.length >= 5) {
      const [joinRef, msgRef, topic, event, payload] = message;
      
      // Handle specific Phoenix events
      if (event === 'phx_reply' && payload.status === 'ok') {
        console.log('Joined channel:', topic);
        return;
      }

      // Emit event to registered handlers
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.forEach(handler => handler(payload));
      }
    }
  }

  private addEventListener(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  private removeEventListener(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  joinTripChannel(tripId: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Socket not connected. Call connectSocket first.');
    }
    
    this.sendMessage('phx_join', {
      topic: `mobile:trip:${tripId}`,
      payload: {},
      ref: Date.now().toString()
    });
  }

  joinDispatchChannel(orgId: string): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Socket not connected. Call connectSocket first.');
    }
    
    this.sendMessage('phx_join', {
      topic: `mobile:org:${orgId}:dispatch`,
      payload: {},
      ref: Date.now().toString()
    });
  }

  // Real-time event handlers
  onLocationUpdate(callback: (data: any) => void): void {
    this.addEventListener('location_update', callback);
  }

  onTripAssigned(callback: (data: any) => void): void {
    this.addEventListener('trip_assigned', callback);
  }

  onGeofenceEvent(callback: (data: any) => void): void {
    this.addEventListener('geo_event', callback);
  }

  onAutoCheckin(callback: (data: any) => void): void {
    this.addEventListener('auto_checkin', callback);
  }

  onDocumentSigned(callback: (data: any) => void): void {
    this.addEventListener('document_signed', callback);
  }

  onEmergencyAlert(callback: (data: any) => void): void {
    this.addEventListener('emergency_alert', callback);
  }

  onInitialState(callback: (data: any) => void): void {
    this.addEventListener('initial_state', callback);
  }

  // Send real-time events
  sendLocationUpdate(locationData: {
    lat: number;
    lng: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
  }): void {
    this.sendMessage('location_update', {
      topic: 'mobile:location',
      payload: locationData,
      ref: Date.now().toString()
    });
  }

  sendManualCheckin(checkinData: {
    trip_id: string;
    type: string;
    lat: number;
    lng: number;
    notes?: string;
    photos?: string[];
  }): void {
    this.sendMessage('manual_checkin', {
      topic: 'mobile:checkin',
      payload: checkinData,
      ref: Date.now().toString()
    });
  }

  sendDeviceStatus(statusData: {
    battery_level?: number;
    network_type?: string;
    gps_enabled?: boolean;
    app_version?: string;
  }): void {
    this.sendMessage('device_status', {
      topic: 'mobile:device',
      payload: statusData,
      ref: Date.now().toString()
    });
  }

  sendEmergencyAlert(alertData: {
    type: string;
    lat: number;
    lng: number;
    accuracy?: number;
    message?: string;
  }): void {
    this.sendMessage('emergency_alert', {
      topic: 'mobile:emergency',
      payload: alertData,
      ref: Date.now().toString()
    });
  }

  sendHeartbeat(): void {
    this.sendMessage('heartbeat', {
      topic: 'mobile:heartbeat',
      payload: {},
      ref: Date.now().toString()
    });
  }

  sendDocumentSigned(documentData: {
    document_id: string;
    signature_data: any;
  }): void {
    this.sendMessage('document_signed', {
      topic: 'mobile:document',
      payload: documentData,
      ref: Date.now().toString()
    });
  }

  // Utility methods
  disconnectSocket(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }

  isSocketConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN || false;
  }
}

// Create singleton instance
const apiClient = new MobileApiClient(
  // Prefer window.location.origin in browser to support LAN/mobile testing; fallback to env
  typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
);

export default apiClient;

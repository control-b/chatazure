import { api } from '@/services/api';

export type Trip = {
  id: string;
  org_id: string;
  driver_id?: string;
  po_number?: string;
  status?: string;
  pickup_location?: { lat: number; lng: number };
  delivery_location?: { lat: number; lng: number };
  geofences?: Array<{ id: string; name: string; type: 'pickup' | 'delivery'; lat: number; lng: number; radius: number }>;
  checkins?: Array<any>;
  next_checkin_type?: 'pickup' | 'delivery' | null;
};

export async function getActiveTrip(userId: string, orgId: string): Promise<Trip | null> {
  const res = await api.get<{ active_trip: Trip | null }>(`/api/mobile/trips/active/${encodeURIComponent(userId)}?orgId=${encodeURIComponent(orgId)}`);
  return res.active_trip;
}

export async function updateLocation(params: { user_id: string; org_id: string; lat: number; lon: number; accuracy?: number; timestamp?: string; }) {
  const payload = {
    ...params,
    timestamp: params.timestamp || new Date().toISOString(),
    accuracy: params.accuracy ?? 10,
  };
  return api.post<{ success: boolean; geofence_events: number }>(`/api/mobile/location`, payload);
}

export async function manualCheckin(params: { user_id: string; org_id: string; trip_id: string; type: 'pickup' | 'delivery'; lat: number; lon: number; notes?: string; }) {
  return api.post(`/api/mobile/checkin/manual`, params);
}

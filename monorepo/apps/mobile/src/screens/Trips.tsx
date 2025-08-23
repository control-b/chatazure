import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Colors } from '@/theme/colors';
import { api } from '@/services/api';
import { useAuth } from '@/store/auth';

export function TripsScreen({ navigation }: any) {
  type Trip = { id: string; po: string; status: string };
  const [trips, setTrips] = useState<Trip[]>([]);
  const { userId, orgId } = useAuth();

  useEffect(() => {
    (async () => {
      if (!userId || !orgId) return;
      try {
        // GET /api/mobile/trips/active/:userId requires orgId via header per pipeline
        const data = await api.get<{ active_trip: any }>(`/api/mobile/trips/active/${encodeURIComponent(userId)}?orgId=${encodeURIComponent(orgId)}`);
        const list: Trip[] = data.active_trip
          ? [{ id: data.active_trip.id || 'active', po: data.active_trip.po_number || 'PO', status: data.active_trip.status || 'active' }]
          : [];
        setTrips(list);
      } catch (e) {
        // Fallback demo list
        setTrips([
          { id: 'trip-001', po: 'PO-2024-001', status: 'En Route to Pickup' },
          { id: 'trip-002', po: 'PO-2024-002', status: 'At Pickup' },
        ]);
      }
    })();
  }, [userId, orgId]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface, padding: 16 }}>
      <TouchableOpacity onPress={() => navigation.navigate('CreateTrip')} style={{ backgroundColor: Colors.accent, padding: 12, borderRadius: 10, marginBottom: 12 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>Create Trip</Text>
      </TouchableOpacity>
      <FlatList
        data={trips}
        keyExtractor={(item: Trip) => item.id}
        renderItem={({ item }: { item: Trip }) => (
          <TouchableOpacity onPress={() => navigation.navigate('TripDetail', { id: item.id })} style={{ backgroundColor: '#0B1220', padding: 16, borderRadius: 12, marginBottom: 12 }}>
            <Text style={{ color: Colors.text, fontWeight: '700' }}>{item.po}</Text>
            <Text style={{ color: Colors.muted }}>{item.status}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

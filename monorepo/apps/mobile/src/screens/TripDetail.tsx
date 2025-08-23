import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/store/auth';
import { getActiveTrip, manualCheckin, Trip } from '@/services/trips';
import { useLocationTracking } from '@/hooks/useLocationTracking';

export function TripDetailScreen({ route, navigation }: any) {
  const { id } = route.params || {};
  const { userId, orgId } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [tracking, setTracking] = useState(true);
  useLocationTracking(tracking);

  useEffect(() => {
    (async () => {
      if (!userId || !orgId) return;
      const t = await getActiveTrip(userId, orgId);
      if (t && (!id || t.id === id)) setTrip(t);
    })();
  }, [userId, orgId, id]);

  const doCheckin = async (type: 'pickup' | 'delivery') => {
    try {
      // Naive: request current location from Location module inline
      const { getCurrentPositionAsync, Accuracy } = await import('expo-location');
      const loc = await getCurrentPositionAsync({ accuracy: Accuracy.Balanced });
      await manualCheckin({
        user_id: userId!,
        org_id: orgId!,
        trip_id: trip?.id || id,
        type,
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
      });
      Alert.alert('Check-in recorded', `Type: ${type}`);
    } catch (e: any) {
      Alert.alert('Check-in failed', e?.message || 'Try again');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface, padding: 16 }}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: Colors.text, fontSize: 18, fontWeight: '700' }}>Trip {trip?.po_number || id}</Text>
        <Text style={{ color: Colors.muted }}>Status: {trip?.status || 'unknown'}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ color: Colors.text }}>Live tracking</Text>
        <Switch value={tracking} onValueChange={setTracking} thumbColor={tracking ? Colors.accent : '#666'} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity onPress={() => doCheckin('pickup')} style={{ backgroundColor: Colors.accent, padding: 12, borderRadius: 10, flex: 1 }}>
          <Text style={{ color: 'white', textAlign: 'center' }}>Check-in Pickup</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => doCheckin('delivery')} style={{ backgroundColor: Colors.success, padding: 12, borderRadius: 10, flex: 1 }}>
          <Text style={{ color: 'white', textAlign: 'center' }}>Check-in Delivery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

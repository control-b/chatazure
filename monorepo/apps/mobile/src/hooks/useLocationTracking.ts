import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useAuth } from '@/store/auth';
import { updateLocation } from '@/services/trips';

export function useLocationTracking(enabled: boolean) {
  const { userId, orgId } = useAuth();
  const watchSub = useRef<Location.LocationSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastSent = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!enabled || !userId || !orgId) return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await maybeSend(current.coords.latitude, current.coords.longitude, current.coords.accuracy || 10);
      watchSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 50 },
        async (loc) => {
          if (cancelled) return;
          await maybeSend(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy || 10);
        }
      );
    })();
    return () => {
      cancelled = true;
      watchSub.current?.remove();
      watchSub.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId, orgId]);

  async function maybeSend(lat: number, lon: number, accuracy: number) {
    const now = Date.now();
    if (now - lastSent.current < 10000) return; // throttle 10s
    lastSent.current = now;
    try {
      await updateLocation({ user_id: userId!, org_id: orgId!, lat, lon, accuracy });
    } catch (e) {
      // swallow errors during tracking; can expose if needed
    }
  }

  return { error };
}

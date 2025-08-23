"use client";

import { useState, useEffect } from "react";

// Mobile Geofence Service for PWA
// Handles background location tracking and geofence monitoring

interface GeofenceConfig {
  id: string;
  tripId: string;
  type: 'pickup' | 'delivery';
  lat: number;
  lng: number;
  radius: number; // meters
  name: string;
}

interface LocationPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface GeofenceEvent {
  geofenceId: string;
  tripId: string;
  type: 'pickup' | 'delivery';
  action: 'enter' | 'exit';
  location: LocationPosition;
  distance: number;
  method: 'auto' | 'manual';
}

class MobileGeofenceService {
  private watchId: number | null = null;
  private geofences: Map<string, GeofenceConfig> = new Map();
  private lastPosition: LocationPosition | null = null;
  private insideGeofences: Set<string> = new Set();
  private onGeofenceEvent: ((event: GeofenceEvent) => void) | null = null;
  private isWatching = false;
  private backgroundSync = false;

  constructor() {
    this.setupServiceWorker();
    this.loadPersistedGeofences();
  }

  // Setup service worker for background geolocation
  private async setupServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      // Do NOT register a second SW; reuse the existing registration if any
      await navigator.serviceWorker.ready;

      // Listen for messages from the existing service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'GEOFENCE_EVENT') {
          this.handleGeofenceEvent(event.data.event);
        }
      });

      console.log('Geofence messaging ready');
    } catch (error) {
      console.error('Geofence SW setup failed:', error);
    }
  }

  // Calculate distance between two points using Haversine formula
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Add geofence for monitoring
  addGeofence(config: GeofenceConfig) {
    this.geofences.set(config.id, config);
    this.persistGeofences();
    
    // Send to service worker for background monitoring
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'ADD_GEOFENCE',
        geofence: config
      });
    }
  }

  // Remove geofence
  removeGeofence(geofenceId: string) {
    this.geofences.delete(geofenceId);
    this.insideGeofences.delete(geofenceId);
    this.persistGeofences();
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'REMOVE_GEOFENCE',
        geofenceId
      });
    }
  }

  // Start location monitoring
  async startMonitoring(options: {
    onGeofenceEvent: (event: GeofenceEvent) => void;
    enableBackground?: boolean;
  }) {
    this.onGeofenceEvent = options.onGeofenceEvent;
    this.backgroundSync = options.enableBackground ?? true;

    // Request location permission
    const permission = await this.requestLocationPermission();
    if (permission !== 'granted') {
      throw new Error('Location permission denied');
    }

    // Start foreground watching
    this.isWatching = true;
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleLocationError(error),
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000, // 1 minute
      }
    );

    // Register for background sync if supported
    if (this.backgroundSync && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in (registration as any)) {
        await (registration as any).sync.register('geofence-sync');
      }
    }

    console.log('Geofence monitoring started');
  }

  // Stop monitoring
  stopMonitoring() {
    this.isWatching = false;
    
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    // Notify service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'STOP_MONITORING'
      });
    }

    console.log('Geofence monitoring stopped');
  }

  // Request location permission with user-friendly messaging
  private async requestLocationPermission(): Promise<PermissionState> {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation not supported');
    }

    try {
      // Check current permission status
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        return 'granted';
      }

      if (permission.state === 'denied') {
        throw new Error('Location permission denied. Please enable in browser settings.');
      }

      // Request permission by trying to get current position
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      return 'granted';
    } catch (error) {
      console.error('Location permission request failed:', error);
      return 'denied';
    }
  }

  // Handle location updates
  private handleLocationUpdate(position: GeolocationPosition) {
    const currentPos: LocationPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: Date.now(),
    };

    this.lastPosition = currentPos;
    this.checkGeofences(currentPos);
  }

  // Handle location errors
  private handleLocationError(error: GeolocationPositionError) {
    console.error('Geolocation error:', error);
    
    let message = 'Location access failed: ';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message += 'Permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        message += 'Position unavailable';
        break;
      case error.TIMEOUT:
        message += 'Request timeout';
        break;
      default:
        message += 'Unknown error';
    }

    // Show user-friendly notification
    this.showNotification('Location Error', message);
  }

  // Check if current position triggers any geofences
  private checkGeofences(position: LocationPosition) {
    this.geofences.forEach((geofence, geofenceId) => {
      const distance = this.calculateDistance(
        position.lat,
        position.lng,
        geofence.lat,
        geofence.lng
      );

      const isInside = distance <= geofence.radius;
      const wasInside = this.insideGeofences.has(geofenceId);

      if (isInside && !wasInside) {
        // Entered geofence
        this.insideGeofences.add(geofenceId);
        this.fireGeofenceEvent({
          geofenceId,
          tripId: geofence.tripId,
          type: geofence.type,
          action: 'enter',
          location: position,
          distance,
          method: 'auto',
        });
      } else if (!isInside && wasInside) {
        // Exited geofence
        this.insideGeofences.delete(geofenceId);
        this.fireGeofenceEvent({
          geofenceId,
          tripId: geofence.tripId,
          type: geofence.type,
          action: 'exit',
          location: position,
          distance,
          method: 'auto',
        });
      }
    });
  }

  // Fire geofence event
  private fireGeofenceEvent(event: GeofenceEvent) {
    console.log('Geofence event:', event);
    
    // Show notification
    this.showNotification(
      `${event.action === 'enter' ? 'Arrived at' : 'Left'} ${event.type}`,
      `Distance: ${Math.round(event.distance)}m`
    );

    // Call handler
    if (this.onGeofenceEvent) {
      this.onGeofenceEvent(event);
    }

    // Store event for potential retry
    this.storeEventForSync(event);
  }

  // Handle geofence events from service worker
  private handleGeofenceEvent(event: GeofenceEvent) {
    if (this.onGeofenceEvent) {
      this.onGeofenceEvent(event);
    }
  }

  // Manual check-in (fallback when auto doesn't work)
  async manualCheckIn(tripId: string, type: 'pickup' | 'delivery'): Promise<GeofenceEvent | null> {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        });
      });

      const currentPos: LocationPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
      };

      // Find matching geofence
      const geofence = Array.from(this.geofences.values()).find(
        g => g.tripId === tripId && g.type === type
      );

      if (!geofence) {
        throw new Error('No geofence found for this trip and type');
      }

      const distance = this.calculateDistance(
        currentPos.lat,
        currentPos.lng,
        geofence.lat,
        geofence.lng
      );

      const event: GeofenceEvent = {
        geofenceId: geofence.id,
        tripId,
        type,
        action: 'enter',
        location: currentPos,
        distance,
        method: 'manual',
      };

      this.fireGeofenceEvent(event);
      return event;
    } catch (error) {
      console.error('Manual check-in failed:', error);
      throw error;
    }
  }

  // Show notification to user
  private async showNotification(title: string, body: string) {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icons/truck-icon.png',
          badge: '/icons/badge-icon.png',
          tag: 'geofence',
          requireInteraction: true,
        });
      }
    }
  }

  // Persist geofences to localStorage
  private persistGeofences() {
    const data = Array.from(this.geofences.entries());
    localStorage.setItem('geofences', JSON.stringify(data));
  }

  // Load geofences from localStorage
  private loadPersistedGeofences() {
    try {
      const data = localStorage.getItem('geofences');
      if (data) {
        const entries = JSON.parse(data);
        this.geofences = new Map(entries);
      }
    } catch (error) {
      console.error('Failed to load persisted geofences:', error);
    }
  }

  // Store event for background sync
  private storeEventForSync(event: GeofenceEvent) {
    try {
      const events = JSON.parse(localStorage.getItem('pending-geofence-events') || '[]');
      events.push(event);
      localStorage.setItem('pending-geofence-events', JSON.stringify(events));
    } catch (error) {
      console.error('Failed to store event for sync:', error);
    }
  }

  // Get pending events for sync
  getPendingEvents(): GeofenceEvent[] {
    try {
      return JSON.parse(localStorage.getItem('pending-geofence-events') || '[]');
    } catch {
      return [];
    }
  }

  // Clear pending events after successful sync
  clearPendingEvents() {
    localStorage.removeItem('pending-geofence-events');
  }

  // Get current status
  getStatus() {
    return {
      isWatching: this.isWatching,
      geofenceCount: this.geofences.size,
      lastPosition: this.lastPosition,
      insideGeofences: Array.from(this.insideGeofences),
    };
  }
}

// Singleton instance
export const mobileGeofenceService = new MobileGeofenceService();

// React hook for using the service
export function useMobileGeofence() {
  const [status, setStatus] = useState(mobileGeofenceService.getStatus());
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('prompt');

  useEffect(() => {
    // Check permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionStatus(result.state);
        result.addEventListener('change', () => setPermissionStatus(result.state));
      });
    }

    // Update status periodically
    const interval = setInterval(() => {
      setStatus(mobileGeofenceService.getStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const startMonitoring = async (onGeofenceEvent: (event: GeofenceEvent) => void) => {
    try {
      await mobileGeofenceService.startMonitoring({
        onGeofenceEvent,
        enableBackground: true,
      });
      setStatus(mobileGeofenceService.getStatus());
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      throw error;
    }
  };

  const stopMonitoring = () => {
    mobileGeofenceService.stopMonitoring();
    setStatus(mobileGeofenceService.getStatus());
  };

  const addGeofence = (config: GeofenceConfig) => {
    mobileGeofenceService.addGeofence(config);
    setStatus(mobileGeofenceService.getStatus());
  };

  const removeGeofence = (geofenceId: string) => {
    mobileGeofenceService.removeGeofence(geofenceId);
    setStatus(mobileGeofenceService.getStatus());
  };

  const manualCheckIn = async (tripId: string, type: 'pickup' | 'delivery') => {
    return mobileGeofenceService.manualCheckIn(tripId, type);
  };

  return {
    status,
    permissionStatus,
    startMonitoring,
    stopMonitoring,
    addGeofence,
    removeGeofence,
    manualCheckIn,
  };
}

// Export types
export type { GeofenceConfig, GeofenceEvent, LocationPosition };

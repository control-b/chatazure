"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import type { Trip, CheckIn, CheckInResponse } from "@/types";

interface GeofenceCheckinProps {
  trip: Trip;
  onCheckinComplete: (checkin: CheckIn) => void;
  className?: string;
}

export function GeofenceCheckin({ 
  trip, 
  onCheckinComplete, 
  className 
}: GeofenceCheckinProps) {
  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number} | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distanceToPickup, setDistanceToPickup] = useState<number | null>(null);
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);
  const [autoCheckinEnabled, setAutoCheckinEnabled] = useState(false);

  // Haversine distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Get current location
  const getCurrentLocation = () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        
        // Calculate distances to pickup and destination
        const pickupDistance = calculateDistance(
          latitude, longitude,
          trip.pickupLocation.lat, trip.pickupLocation.lng
        );
        const destDistance = calculateDistance(
          latitude, longitude,
          trip.destinationLocation.lat, trip.destinationLocation.lng
        );
        
        setDistanceToPickup(pickupDistance);
        setDistanceToDestination(destDistance);
        setIsLoadingLocation(false);
      },
      (error) => {
        let errorMessage = "Unable to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        setLocationError(errorMessage);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Auto check-in when within geofence
  useEffect(() => {
    if (!autoCheckinEnabled || !currentLocation) return;

    const pickupRadius = trip.pickupLocation.geofenceRadius || 150;
    const destRadius = trip.destinationLocation.geofenceRadius || 150;

    // Check if within pickup geofence and haven't checked in yet
    if (distanceToPickup !== null && distanceToPickup <= pickupRadius) {
      const hasPickupCheckin = trip.checkIns.some(c => c.type === 'pickup');
      if (!hasPickupCheckin) {
        handleCheckin('pickup', 'auto');
      }
    }

    // Check if within destination geofence and have checked in at pickup
    if (distanceToDestination !== null && distanceToDestination <= destRadius) {
      const hasPickupCheckin = trip.checkIns.some(c => c.type === 'pickup');
      const hasDestCheckin = trip.checkIns.some(c => c.type === 'delivery');
      if (hasPickupCheckin && !hasDestCheckin) {
        handleCheckin('delivery', 'auto');
      }
    }
  }, [currentLocation, distanceToPickup, distanceToDestination, autoCheckinEnabled]);

  // Handle check-in
  const handleCheckin = async (type: 'pickup' | 'delivery', method: 'auto' | 'manual') => {
    if (!currentLocation && method === 'auto') {
      return;
    }

    setIsCheckingIn(true);
    try {
      const response = await fetch('/api/geofence/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trip_id: trip.id,
          lat: currentLocation?.lat || 0,
          lng: currentLocation?.lng || 0,
          type,
          method
        }),
      });

      const result: CheckInResponse = await response.json();
      
      if (result.accepted) {
        const newCheckin: CheckIn = {
          id: result.checkinId,
          tripId: trip.id,
          type,
          lat: currentLocation?.lat || 0,
          lng: currentLocation?.lng || 0,
          method,
          distanceMeters: result.distanceM,
          timestamp: new Date(),
          userId: 'current-user' // TODO: Get from session
        };
        
        onCheckinComplete(newCheckin);
      } else {
        alert(result.message || 'Check-in failed');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      alert('Check-in failed. Please try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Start location tracking
  useEffect(() => {
    getCurrentLocation();
    
    // Set up periodic location updates for auto check-in
    const interval = setInterval(() => {
      if (autoCheckinEnabled) {
        getCurrentLocation();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [autoCheckinEnabled]);

  const hasPickupCheckin = trip.checkIns.some(c => c.type === 'pickup');
  const hasDeliveryCheckin = trip.checkIns.some(c => c.type === 'delivery');
  const canCheckinPickup = !hasPickupCheckin && distanceToPickup !== null && distanceToPickup <= (trip.pickupLocation.geofenceRadius || 150);
  const canCheckinDelivery = hasPickupCheckin && !hasDeliveryCheckin && distanceToDestination !== null && distanceToDestination <= (trip.destinationLocation.geofenceRadius || 150);

  return (
    <div className={cn("bg-slate-900 rounded-lg border border-slate-700 p-6", className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-400" />
            Geofence Check-in
          </h3>
          
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={autoCheckinEnabled}
                onChange={(e) => setAutoCheckinEnabled(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800"
              />
              Auto check-in
            </label>
          </div>
        </div>

        {/* Current Location Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Current Location</span>
            <Button
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {isLoadingLocation ? "Getting..." : "Refresh"}
            </Button>
          </div>

          {locationError && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-200 text-sm">{locationError}</p>
            </div>
          )}

          {currentLocation && (
            <div className="p-3 bg-slate-800 border border-slate-600 rounded-lg">
              <p className="text-slate-300 text-sm">
                📍 {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Pickup Check-in */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-green-400" />
            <span className="font-medium text-white">Pickup Location</span>
            {hasPickupCheckin && (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
          </div>

          <div className="p-3 bg-slate-800 border border-slate-600 rounded-lg">
            <p className="text-slate-300 font-medium">{trip.pickupLocation.name}</p>
            {trip.pickupLocation.address && (
              <p className="text-slate-400 text-sm">{trip.pickupLocation.address}</p>
            )}
            
            {distanceToPickup !== null && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-slate-400">Distance:</span>
                <span className={cn(
                  "text-sm font-medium",
                  distanceToPickup <= (trip.pickupLocation.geofenceRadius || 150)
                    ? "text-green-400"
                    : "text-orange-400"
                )}>
                  {distanceToPickup.toFixed(0)}m
                </span>
              </div>
            )}
          </div>

          {!hasPickupCheckin && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleCheckin('pickup', 'manual')}
                disabled={isCheckingIn}
                variant="outline"
                className="flex-1"
              >
                {isCheckingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MapPin className="h-4 w-4 mr-2" />
                )}
                Manual Check-in
              </Button>
              
              {canCheckinPickup && (
                <Button
                  onClick={() => handleCheckin('pickup', 'auto')}
                  disabled={isCheckingIn}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isCheckingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Check-in at Pickup
                </Button>
              )}
            </div>
          )}

          {hasPickupCheckin && (
            <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg">
              <p className="text-green-200 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Checked in at pickup
              </p>
            </div>
          )}
        </div>

        {/* Destination Check-in */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-red-400" />
            <span className="font-medium text-white">Destination</span>
            {hasDeliveryCheckin && (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
          </div>

          <div className="p-3 bg-slate-800 border border-slate-600 rounded-lg">
            <p className="text-slate-300 font-medium">{trip.destinationLocation.name}</p>
            {trip.destinationLocation.address && (
              <p className="text-slate-400 text-sm">{trip.destinationLocation.address}</p>
            )}
            
            {distanceToDestination !== null && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-slate-400">Distance:</span>
                <span className={cn(
                  "text-sm font-medium",
                  distanceToDestination <= (trip.destinationLocation.geofenceRadius || 150)
                    ? "text-green-400"
                    : "text-orange-400"
                )}>
                  {distanceToDestination.toFixed(0)}m
                </span>
              </div>
            )}
          </div>

          {hasPickupCheckin && !hasDeliveryCheckin && (
            <div className="flex gap-2">
              <Button
                onClick={() => handleCheckin('delivery', 'manual')}
                disabled={isCheckingIn}
                variant="outline"
                className="flex-1"
              >
                {isCheckingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                Manual Check-in
              </Button>
              
              {canCheckinDelivery && (
                <Button
                  onClick={() => handleCheckin('delivery', 'auto')}
                  disabled={isCheckingIn}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {isCheckingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Check-in at Destination
                </Button>
              )}
            </div>
          )}

          {hasDeliveryCheckin && (
            <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg">
              <p className="text-green-200 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Checked in at destination
              </p>
            </div>
          )}

          {!hasPickupCheckin && (
            <div className="p-3 bg-orange-900/50 border border-orange-700 rounded-lg">
              <p className="text-orange-200 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Complete pickup check-in first
              </p>
            </div>
          )}
        </div>

        {/* Check-in History */}
        {trip.checkIns.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              Check-in History
            </h4>
            
            <div className="space-y-2">
              {trip.checkIns.map((checkin) => (
                <div key={checkin.id} className="p-3 bg-slate-800 border border-slate-600 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {checkin.type === 'pickup' ? (
                        <MapPin className="h-4 w-4 text-green-400" />
                      ) : (
                        <Navigation className="h-4 w-4 text-red-400" />
                      )}
                      <span className="text-slate-300 font-medium capitalize">
                        {checkin.type} Check-in
                      </span>
                      <span className={cn(
                        "text-xs px-2 py-1 rounded",
                        checkin.method === 'auto' 
                          ? "bg-green-900/50 text-green-200"
                          : "bg-blue-900/50 text-blue-200"
                      )}>
                        {checkin.method}
                      </span>
                    </div>
                    <span className="text-slate-400 text-sm">
                      {checkin.distanceMeters.toFixed(0)}m away
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    {checkin.timestamp.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

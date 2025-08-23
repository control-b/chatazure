"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  Phone,
  Camera,
  Upload,
  X,
  Loader2,
  Package,
} from "lucide-react";
import { useMobileGeofence, type GeofenceEvent } from "@/lib/mobile-geofence";

interface Trip {
  id: string;
  poNumber: string;
  driverName: string;
  driverPhone: string;
  truckNumber: string;
  trailerNumber?: string;
  pickupLocation: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  deliveryLocation: {
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  status: 'created' | 'en_route' | 'arrived_pickup' | 'loaded' | 'en_route_delivery' | 'arrived_delivery' | 'delivered';
  assignedDoor?: string;
  checkIns: CheckIn[];
}

interface CheckIn {
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

interface MobileCheckInProps {
  trip: Trip;
  currentLocation?: { lat: number; lng: number };
  onCheckIn: (checkInData: Omit<CheckIn, 'id'>) => Promise<void>;
  onTakePhoto?: () => void;
  onCallDispatch?: () => void;
  className?: string;
}

export function MobileCheckIn({
  trip,
  currentLocation,
  onCheckIn,
  onTakePhoto,
  onCallDispatch,
  className,
}: MobileCheckInProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showManualCheckIn, setShowManualCheckIn] = useState(false);
  const [manualNotes, setManualNotes] = useState('');
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  
  const { 
    status: geofenceStatus,
    permissionStatus,
    startMonitoring,
    addGeofence,
    manualCheckIn,
  } = useMobileGeofence();

  // Determine next check-in type
  const getNextCheckInType = (): 'pickup' | 'delivery' | null => {
    const hasPickupCheckIn = trip.checkIns.some(c => c.type === 'pickup');
    const hasDeliveryCheckIn = trip.checkIns.some(c => c.type === 'delivery');
    
    if (!hasPickupCheckIn) return 'pickup';
    if (!hasDeliveryCheckIn) return 'delivery';
    return null;
  };

  const nextCheckInType = getNextCheckInType();
  const targetLocation = nextCheckInType === 'pickup' ? trip.pickupLocation : trip.deliveryLocation;

  // Calculate distance to target
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const distanceToTarget = currentPosition && targetLocation
    ? calculateDistance(currentPosition.lat, currentPosition.lng, targetLocation.lat, targetLocation.lng)
    : null;

  const isWithinGeofence = distanceToTarget ? distanceToTarget <= 150 : false; // 150m radius

  // Setup geofence monitoring
  useEffect(() => {
    if (nextCheckInType && targetLocation && targetLocation.lat && targetLocation.lng) {
      addGeofence({
        id: `${trip.id}-${nextCheckInType}`,
        tripId: trip.id,
        type: nextCheckInType,
        lat: targetLocation.lat,
        lng: targetLocation.lng,
        radius: 150, // 150 meters
        name: targetLocation.name || `${nextCheckInType} location`,
      });

      // Start monitoring if permission granted
      if (permissionStatus === 'granted') {
        startMonitoring(handleGeofenceEvent);
      }
    }
  }, [nextCheckInType, targetLocation, permissionStatus]);

  const handleGeofenceEvent = async (event: GeofenceEvent) => {
    if (event.action === 'enter' && event.tripId === trip.id) {
      // Auto check-in triggered
      console.log('Auto check-in triggered:', event);
      
      const checkInData: Omit<CheckIn, 'id'> = {
        type: event.type,
        timestamp: new Date().toISOString(),
        location: {
          lat: event.location.lat,
          lng: event.location.lng,
          accuracy: event.location.accuracy,
        },
        method: 'auto',
        distance: event.distance,
      };

      try {
        await onCheckIn(checkInData);
      } catch (error) {
        console.error('Auto check-in failed:', error);
      }
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    setIsLoading(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000, // 1 minute
        });
      });

      const pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      setCurrentPosition(pos);
    } catch (error: any) {
      console.error('Location error:', error);
      let message = 'Unable to get location: ';
      
      switch (error.code) {
        case 1:
          message += 'Permission denied';
          break;
        case 2:
          message += 'Position unavailable';
          break;
        case 3:
          message += 'Timeout';
          break;
        default:
          message += 'Unknown error';
      }
      
      setLocationError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Manual check-in
  const handleManualCheckIn = async () => {
    if (!nextCheckInType) return;

    try {
      setIsLoading(true);
      
      // Get current location first
      await getCurrentLocation();
      
      if (!currentPosition) {
        setShowManualCheckIn(true);
        return;
      }

      const distance = targetLocation ? calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        targetLocation.lat,
        targetLocation.lng
      ) : 0;

      const checkInData: Omit<CheckIn, 'id'> = {
        type: nextCheckInType,
        timestamp: new Date().toISOString(),
        location: currentPosition,
        method: 'manual',
        distance,
        notes: manualNotes || undefined,
        photos: capturedPhotos.length > 0 ? capturedPhotos : undefined,
      };

      await onCheckIn(checkInData);
      setManualNotes('');
      setCapturedPhotos([]);
      setShowManualCheckIn(false);
    } catch (error) {
      console.error('Manual check-in failed:', error);
      alert('Check-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  if (!nextCheckInType) {
    return (
      <div className={cn("p-6 bg-green-50 border border-green-200 rounded-lg", className)}>
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">Trip Complete</h3>
          <p className="text-green-700">All check-ins completed for this trip.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Trip Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Trip {trip.poNumber}
            </h3>
            <p className="text-sm text-slate-600">
              Next: {nextCheckInType === 'pickup' ? 'Pickup' : 'Delivery'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-900">
              {trip.truckNumber}
            </div>
            {trip.trailerNumber && (
              <div className="text-xs text-slate-600">
                Trailer: {trip.trailerNumber}
              </div>
            )}
          </div>
        </div>

        {/* Location Info */}
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              {nextCheckInType === 'pickup' ? (
                <MapPin className="h-5 w-5 text-blue-600" />
              ) : (
                <Package className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900">
                {targetLocation?.name || `${nextCheckInType} location`}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {targetLocation?.address}
              </div>
              {distanceToTarget && (
                <div className="text-xs text-slate-500 mt-1">
                  Distance: {Math.round(distanceToTarget)}m away
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-slate-900">Location Status</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        </div>

        {locationError ? (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="text-sm text-red-800">{locationError}</div>
          </div>
        ) : currentPosition ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-800">
                Location acquired (±{Math.round(currentPosition.accuracy)}m)
              </div>
            </div>
            
            {isWithinGeofence && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  You're within the {nextCheckInType} geofence
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              Getting your location...
            </div>
          </div>
        )}
      </div>

      {/* Check-in Actions */}
      <div className="space-y-3">
        {/* Auto Check-in Status */}
        {geofenceStatus.isWatching && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">Auto Check-in Active</span>
            </div>
            <p className="text-sm text-blue-800">
              We'll automatically check you in when you arrive at the {nextCheckInType} location.
            </p>
          </div>
        )}

        {/* Manual Check-in Button */}
        <Button
          onClick={handleManualCheckIn}
          disabled={isLoading}
          className="w-full py-4 text-lg"
          variant={isWithinGeofence ? "default" : "outline"}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Checking in...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              {isWithinGeofence ? 'Check In Now' : 'Manual Check In'}
            </>
          )}
        </Button>

        {/* Additional Actions */}
        <div className="grid grid-cols-2 gap-3">
          {onTakePhoto && (
            <Button variant="outline" onClick={onTakePhoto} className="py-3">
              <Camera className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
          )}
          
          {onCallDispatch && (
            <Button variant="outline" onClick={onCallDispatch} className="py-3">
              <Phone className="h-4 w-4 mr-2" />
              Call Dispatch
            </Button>
          )}
        </div>
      </div>

      {/* Manual Check-in Modal */}
      {showManualCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-h-[80vh] rounded-t-lg">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Manual Check-in</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualCheckIn(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {!currentPosition && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Location unavailable. Please add notes about your location.
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about your arrival, gate codes, etc."
                  rows={3}
                />
              </div>

              {capturedPhotos.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Photos ({capturedPhotos.length})
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {capturedPhotos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowManualCheckIn(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleManualCheckIn}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Checking in...
                    </>
                  ) : (
                    'Confirm Check-in'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

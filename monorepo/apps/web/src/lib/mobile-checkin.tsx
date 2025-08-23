'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Camera, 
  Phone, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Info,
  Navigation,
  Target,
  Loader2,
  Upload,
  X
} from 'lucide-react';
import { useMobileStore } from '@/lib/mobile-store';

interface CheckInMobileProps {
  className?: string;
}

export function CheckInMobile({ className }: CheckInMobileProps) {
  const {
    activeTrip,
    currentLocation,
    isLocationTracking,
    performManualCheckin,
    startLocationTracking,
  } = useMobileStore();

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInType, setCheckInType] = useState<'pickup' | 'delivery' | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activeTrip) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No active trip available for check-in</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate distance to pickup/delivery locations
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const distanceToPickup = currentLocation ? 
    calculateDistance(
      currentLocation.lat, 
      currentLocation.lng,
      activeTrip.pickupLocation.lat,
      activeTrip.pickupLocation.lng
    ) : null;

  const distanceToDelivery = currentLocation ?
    calculateDistance(
      currentLocation.lat,
      currentLocation.lng, 
      activeTrip.deliveryLocation.lat,
      activeTrip.deliveryLocation.lng
    ) : null;

  const canCheckInPickup = distanceToPickup && distanceToPickup <= 200; // 200m radius
  const canCheckInDelivery = distanceToDelivery && distanceToDelivery <= 200;

  const hasPickupCheckIn = activeTrip.checkins?.some(c => c.type === 'pickup');
  const hasDeliveryCheckIn = activeTrip.checkins?.some(c => c.type === 'delivery');

  const handleStartCheckIn = (type: 'pickup' | 'delivery') => {
    setCheckInType(type);
    setNotes('');
    setPhotos([]);
  };

  const handleCancelCheckIn = () => {
    setCheckInType(null);
    setNotes('');
    setPhotos([]);
  };

  const handleTakePhoto = () => {
    setShowCamera(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setPhotos(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleSubmitCheckIn = async () => {
    if (!checkInType || !currentLocation) return;

    setIsCheckingIn(true);
    try {
      const success = await performManualCheckin({
        type: checkInType,
        notes: notes.trim(),
        photos: photos.length > 0 ? photos : undefined,
      });

      if (success) {
        setCheckInType(null);
        setNotes('');
        setPhotos([]);
      }
    } catch (error) {
      console.error('Check-in failed:', error);
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (!isLocationTracking) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Location tracking is required for check-ins.
              <Button 
                variant="link" 
                className="p-0 h-auto ml-2"
                onClick={startLocationTracking}
              >
                Enable Location
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!currentLocation) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin mb-4">
            <Loader2 className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-muted-foreground">Getting your location...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Trip Overview */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            {activeTrip.poNumber}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="outline" className="w-fit">
            {activeTrip.status.replace('_', ' ').toUpperCase()}
          </Badge>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Truck</p>
              <p className="font-medium">{activeTrip.truckNumber}</p>
            </div>
            {activeTrip.trailerNumber && (
              <div>
                <p className="text-muted-foreground">Trailer</p>
                <p className="font-medium">{activeTrip.trailerNumber}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Check-in Interface */}
      {checkInType ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              {checkInType === 'pickup' ? 'Pickup' : 'Delivery'} Check-In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">
                    {checkInType === 'pickup' 
                      ? activeTrip.pickupLocation.name 
                      : activeTrip.deliveryLocation.name
                    }
                  </p>
                  <p className="text-sm text-blue-700">
                    {checkInType === 'pickup'
                      ? activeTrip.pickupLocation.address
                      : activeTrip.deliveryLocation.address
                    }
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Notes (Optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant notes about this check-in..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Photos (Optional)
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTakePhoto}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-1 right-1 h-6 w-6 p-0"
                        onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCancelCheckIn}
                className="flex-1"
                disabled={isCheckingIn}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCheckIn}
                className="flex-1"
                disabled={isCheckingIn}
              >
                {isCheckingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking In...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check In
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pickup Check-in */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Pickup Location</span>
                    {hasPickupCheckIn && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {activeTrip.pickupLocation.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeTrip.pickupLocation.address}
                  </p>
                  
                  {distanceToPickup && (
                    <div className="mt-3">
                      <Badge 
                        variant={canCheckInPickup ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {Math.round(distanceToPickup)}m away
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  {hasPickupCheckIn ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleStartCheckIn('pickup')}
                      disabled={!canCheckInPickup}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Check In
                    </Button>
                  )}
                </div>
              </div>
              
              {!canCheckInPickup && !hasPickupCheckIn && (
                <Alert className="mt-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Get within 200m of the pickup location to check in
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Delivery Check-in */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Delivery Location</span>
                    {hasDeliveryCheckIn && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {activeTrip.deliveryLocation.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeTrip.deliveryLocation.address}
                  </p>
                  
                  {distanceToDelivery && (
                    <div className="mt-3">
                      <Badge 
                        variant={canCheckInDelivery ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {Math.round(distanceToDelivery)}m away
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  {hasDeliveryCheckIn ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleStartCheckIn('delivery')}
                      disabled={!canCheckInDelivery || !hasPickupCheckIn}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Check In
                    </Button>
                  )}
                </div>
              </div>
              
              {!hasPickupCheckIn && (
                <Alert className="mt-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Complete pickup check-in first
                  </AlertDescription>
                </Alert>
              )}
              
              {!canCheckInDelivery && hasPickupCheckIn && !hasDeliveryCheckIn && (
                <Alert className="mt-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Get within 200m of the delivery location to check in
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardContent className="p-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open('tel:+1234567890', '_self')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Dispatch
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h3 className="font-semibold mb-4">Take Photo</h3>
              <div className="text-center text-muted-foreground mb-4">
                Camera functionality requires implementation
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCamera(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

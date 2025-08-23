"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Camera,
  Truck,
  Phone,
  Navigation,
  Save,
  X,
  Plus,
  Clock,
  Package,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface MobileTripData {
  poNumber: string;
  driverName: string;
  driverPhone: string;
  truckNumber: string;
  trailerNumber?: string;
  pickupLocation: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
  };
  deliveryLocation: {
    name: string;
    address: string;
    lat?: number;
    lng?: number;
  };
  scheduledPickupTime?: string;
  notes?: string;
}

interface MobileTripCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tripData: MobileTripData) => Promise<void>;
  driverInfo?: {
    name: string;
    phone: string;
    defaultTruck?: string;
  };
  className?: string;
}

export function MobileTripCreation({
  isOpen,
  onClose,
  onSubmit,
  driverInfo,
  className,
}: MobileTripCreationProps) {
  const [currentStep, setCurrentStep] = useState<'basic' | 'pickup' | 'delivery' | 'review'>('basic');
  const [tripData, setTripData] = useState<MobileTripData>({
    poNumber: "",
    driverName: driverInfo?.name || "",
    driverPhone: driverInfo?.phone || "",
    truckNumber: driverInfo?.defaultTruck || "",
    trailerNumber: "",
    pickupLocation: {
      name: "",
      address: "",
    },
    deliveryLocation: {
      name: "",
      address: "",
    },
    scheduledPickupTime: "",
    notes: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  // Check geolocation permission on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.permissions?.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state as any);
      });
    }
  }, []);

  const requestLocation = async () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by this device');
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;
      setCurrentLocation({ lat: latitude, lng: longitude });
      
      // Reverse geocode to get address
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
        );
        const data = await response.json();
        
        if (data.features && data.features[0]) {
          const address = data.features[0].place_name;
          return { lat: latitude, lng: longitude, address };
        }
      } catch (error) {
        console.error('Reverse geocoding failed:', error);
      }

      return { lat: latitude, lng: longitude, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` };
    } catch (error) {
      console.error('Location access failed:', error);
      alert('Unable to access location. Please enable location services and try again.');
      return null;
    }
  };

  const useCurrentLocationForPickup = async () => {
    const location = await requestLocation();
    if (location) {
      setTripData(prev => ({
        ...prev,
        pickupLocation: {
          name: "Current Location",
          address: location.address,
          lat: location.lat,
          lng: location.lng,
        }
      }));
    }
  };

  const handleStepNavigation = (step: typeof currentStep) => {
    // Validation before moving to next step
    if (step === 'pickup' && !tripData.poNumber.trim()) {
      alert('Please enter a PO Number');
      return;
    }
    if (step === 'delivery' && !tripData.pickupLocation.address.trim()) {
      alert('Please enter pickup location');
      return;
    }
    if (step === 'review' && !tripData.deliveryLocation.address.trim()) {
      alert('Please enter delivery location');
      return;
    }
    
    setCurrentStep(step);
  };

  const handleSubmit = async () => {
    if (!tripData.poNumber.trim() || !tripData.pickupLocation.address || !tripData.deliveryLocation.address) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(tripData);
      onClose();
      // Reset form
      setTripData({
        poNumber: "",
        driverName: driverInfo?.name || "",
        driverPhone: driverInfo?.phone || "",
        truckNumber: driverInfo?.defaultTruck || "",
        trailerNumber: "",
        pickupLocation: { name: "", address: "" },
        deliveryLocation: { name: "", address: "" },
        scheduledPickupTime: "",
        notes: "",
      });
      setCurrentStep('basic');
    } catch (error) {
      console.error('Failed to create trip:', error);
      alert('Failed to create trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const stepTitles = {
    basic: 'Trip Info',
    pickup: 'Pickup Location',
    delivery: 'Delivery Location',
    review: 'Review & Submit'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 md:items-center">
      <div className={cn(
        "bg-white w-full max-h-[90vh] overflow-hidden",
        "md:max-w-md md:rounded-lg md:shadow-xl",
        "rounded-t-2xl", // Mobile: rounded top corners
        className
      )}>
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{stepTitles[currentStep]}</h2>
            <div className="flex items-center gap-2 mt-1">
              {Object.keys(stepTitles).map((step, index) => (
                <div
                  key={step}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    step === currentStep ? "bg-blue-500" : 
                    Object.keys(stepTitles).indexOf(currentStep) > index ? "bg-green-500" : "bg-slate-300"
                  )}
                />
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {currentStep === 'basic' && (
            <div className="space-y-6">
              {/* PO Number */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  PO Number *
                </label>
                <input
                  type="text"
                  value={tripData.poNumber}
                  onChange={(e) => setTripData(prev => ({ ...prev, poNumber: e.target.value }))}
                  className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter PO Number"
                  autoComplete="off"
                />
              </div>

              {/* Driver Info */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    value={tripData.driverName}
                    onChange={(e) => setTripData(prev => ({ ...prev, driverName: e.target.value }))}
                    className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Driver name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={tripData.driverPhone}
                    onChange={(e) => setTripData(prev => ({ ...prev, driverPhone: e.target.value }))}
                    className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Vehicle Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Truck # *
                  </label>
                  <input
                    type="text"
                    value={tripData.truckNumber}
                    onChange={(e) => setTripData(prev => ({ ...prev, truckNumber: e.target.value }))}
                    className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="T001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Trailer #
                  </label>
                  <input
                    type="text"
                    value={tripData.trailerNumber}
                    onChange={(e) => setTripData(prev => ({ ...prev, trailerNumber: e.target.value }))}
                    className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="TR001"
                  />
                </div>
              </div>

              {/* Scheduled Pickup */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Scheduled Pickup Time
                </label>
                <input
                  type="datetime-local"
                  value={tripData.scheduledPickupTime}
                  onChange={(e) => setTripData(prev => ({ ...prev, scheduledPickupTime: e.target.value }))}
                  className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {currentStep === 'pickup' && (
            <div className="space-y-6">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                <p className="text-slate-600">Set your pickup location</p>
              </div>

              {/* Current Location Button */}
              <Button
                onClick={useCurrentLocationForPickup}
                className="w-full py-4 text-lg"
                variant="outline"
              >
                <Navigation className="h-5 w-5 mr-2" />
                Use Current Location
              </Button>

              <Separator />

              {/* Manual Entry */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Location Name
                  </label>
                  <input
                    type="text"
                    value={tripData.pickupLocation.name}
                    onChange={(e) => setTripData(prev => ({
                      ...prev,
                      pickupLocation: { ...prev.pickupLocation, name: e.target.value }
                    }))}
                    className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Warehouse A, Customer Site, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    value={tripData.pickupLocation.address}
                    onChange={(e) => setTripData(prev => ({
                      ...prev,
                      pickupLocation: { ...prev.pickupLocation, address: e.target.value }
                    }))}
                    className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter full address"
                    rows={3}
                  />
                </div>
              </div>

              {tripData.pickupLocation.address && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Pickup location set</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'delivery' && (
            <div className="space-y-6">
              <div className="text-center">
                <Package className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-slate-600">Set your delivery location</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Location Name
                  </label>
                  <input
                    type="text"
                    value={tripData.deliveryLocation.name}
                    onChange={(e) => setTripData(prev => ({
                      ...prev,
                      deliveryLocation: { ...prev.deliveryLocation, name: e.target.value }
                    }))}
                    className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Customer Site, Distribution Center, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Address *
                  </label>
                  <textarea
                    value={tripData.deliveryLocation.address}
                    onChange={(e) => setTripData(prev => ({
                      ...prev,
                      deliveryLocation: { ...prev.deliveryLocation, address: e.target.value }
                    }))}
                    className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter full address"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={tripData.notes}
                    onChange={(e) => setTripData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Special instructions, gate codes, etc."
                    rows={2}
                  />
                </div>
              </div>

              {tripData.deliveryLocation.address && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Delivery location set</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-slate-600">Review your trip details</p>
              </div>

              <div className="space-y-4">
                {/* Trip Info */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-medium text-slate-900 mb-2">Trip Information</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">PO Number:</span>
                      <span className="font-medium">{tripData.poNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Driver:</span>
                      <span className="font-medium">{tripData.driverName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Truck:</span>
                      <span className="font-medium">{tripData.truckNumber}</span>
                    </div>
                    {tripData.trailerNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Trailer:</span>
                        <span className="font-medium">{tripData.trailerNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pickup */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Pickup Location
                  </h3>
                  <div className="text-sm">
                    {tripData.pickupLocation.name && (
                      <div className="font-medium text-blue-800">{tripData.pickupLocation.name}</div>
                    )}
                    <div className="text-blue-700">{tripData.pickupLocation.address}</div>
                  </div>
                </div>

                {/* Delivery */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Delivery Location
                  </h3>
                  <div className="text-sm">
                    {tripData.deliveryLocation.name && (
                      <div className="font-medium text-green-800">{tripData.deliveryLocation.name}</div>
                    )}
                    <div className="text-green-700">{tripData.deliveryLocation.address}</div>
                  </div>
                </div>

                {tripData.notes && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h3 className="font-medium text-yellow-900 mb-2">Notes</h3>
                    <div className="text-sm text-yellow-800">{tripData.notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Footer */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-3">
            {currentStep !== 'basic' && (
              <Button
                variant="outline"
                onClick={() => {
                  const steps = ['basic', 'pickup', 'delivery', 'review'];
                  const currentIndex = steps.indexOf(currentStep);
                  if (currentIndex > 0) {
                    setCurrentStep(steps[currentIndex - 1] as typeof currentStep);
                  }
                }}
                className="flex-1 py-3"
              >
                Back
              </Button>
            )}
            
            {currentStep !== 'review' ? (
              <Button
                onClick={() => {
                  const steps = ['basic', 'pickup', 'delivery', 'review'];
                  const currentIndex = steps.indexOf(currentStep);
                  if (currentIndex < steps.length - 1) {
                    handleStepNavigation(steps[currentIndex + 1] as typeof currentStep);
                  }
                }}
                className="flex-1 py-3"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Trip
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

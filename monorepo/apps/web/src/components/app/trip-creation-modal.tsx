"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Save,
  MapPin,
  Truck,
  Package,
  User,
  Phone,
  Navigation,
  Calendar,
  Plus,
  Search,
} from "lucide-react";
import type { Trip, Location, Vehicle, User as UserType } from "@/types/index";

interface TripCreationModalProps {
  isOpen: boolean;
  drivers: UserType[];
  onClose: () => void;
  onCreate: (tripData: CreateTripData) => void;
  className?: string;
}

interface CreateTripData {
  poNumber: string;
  driverId: string;
  pickupLocation: Location;
  destinationLocation: Location;
  vehicle: Vehicle;
  scheduledPickupTime?: Date;
  notes?: string;
}

export function TripCreationModal({
  isOpen,
  drivers,
  onClose,
  onCreate,
  className,
}: TripCreationModalProps) {
  const [tripData, setTripData] = useState<CreateTripData>({
    poNumber: "",
    driverId: "",
    pickupLocation: {
      lat: 0,
      lng: 0,
      name: "",
      address: "",
      geofenceRadius: 150,
    },
    destinationLocation: {
      lat: 0,
      lng: 0,
      name: "",
      address: "",
      geofenceRadius: 150,
    },
    vehicle: {
      truckNumber: "",
      trailerNumber: "",
      type: "truck",
    },
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGettingLocation, setIsGettingLocation] = useState<'pickup' | 'destination' | null>(null);

  const pickupAddressRef = useRef<HTMLInputElement>(null);
  const destAddressRef = useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!tripData.poNumber.trim()) {
      newErrors.poNumber = "PO Number is required";
    }

    if (!tripData.driverId) {
      newErrors.driverId = "Driver selection is required";
    }

    if (!tripData.pickupLocation.name.trim()) {
      newErrors.pickupName = "Pickup location name is required";
    }

    if (!tripData.destinationLocation.name.trim()) {
      newErrors.destName = "Destination location name is required";
    }

    if (!tripData.vehicle.truckNumber.trim()) {
      newErrors.truckNumber = "Truck number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGetCurrentLocation = (type: 'pickup' | 'destination') => {
    setIsGettingLocation(type);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // In a real app, you'd use a geocoding service to get the address
        const locationUpdate = {
          lat: latitude,
          lng: longitude,
          name: `Current Location (${type})`,
          address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          geofenceRadius: 150,
        };

        if (type === 'pickup') {
          setTripData(prev => ({
            ...prev,
            pickupLocation: locationUpdate,
          }));
        } else {
          setTripData(prev => ({
            ...prev,
            destinationLocation: locationUpdate,
          }));
        }
        
        setIsGettingLocation(null);
      },
      (error) => {
        alert(`Unable to get location: ${error.message}`);
        setIsGettingLocation(null);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleAddressSearch = async (type: 'pickup' | 'destination', address: string) => {
    // In a real implementation, you'd use a geocoding service like Google Maps
    // For now, we'll just update the address field
    if (type === 'pickup') {
      setTripData(prev => ({
        ...prev,
        pickupLocation: {
          ...prev.pickupLocation,
          address,
          name: address || prev.pickupLocation.name,
        },
      }));
    } else {
      setTripData(prev => ({
        ...prev,
        destinationLocation: {
          ...prev.destinationLocation,
          address,
          name: address || prev.destinationLocation.name,
        },
      }));
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onCreate(tripData);
      onClose();
      // Reset form
      setTripData({
        poNumber: "",
        driverId: "",
        pickupLocation: {
          lat: 0,
          lng: 0,
          name: "",
          address: "",
          geofenceRadius: 150,
        },
        destinationLocation: {
          lat: 0,
          lng: 0,
          name: "",
          address: "",
          geofenceRadius: 150,
        },
        vehicle: {
          truckNumber: "",
          trailerNumber: "",
          type: "truck",
        },
        notes: "",
      });
      setErrors({});
    }
  };

  const selectedDriver = drivers.find(d => d.id === tripData.driverId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={cn(
        "bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Create New Trip</h2>
            <p className="text-sm text-slate-600 mt-1">
              Set up pickup and delivery locations with automatic geofence monitoring
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          {/* Trip Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                PO Number *
              </label>
              <input
                type="text"
                value={tripData.poNumber}
                onChange={(e) => setTripData(prev => ({ ...prev, poNumber: e.target.value }))}
                className={cn(
                  "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                  errors.poNumber ? "border-red-300" : "border-slate-300"
                )}
                placeholder="Enter PO number"
              />
              {errors.poNumber && (
                <p className="text-red-600 text-sm mt-1">{errors.poNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Scheduled Pickup Time
              </label>
              <input
                type="datetime-local"
                value={tripData.scheduledPickupTime?.toISOString().slice(0, 16) || ""}
                onChange={(e) => setTripData(prev => ({ 
                  ...prev, 
                  scheduledPickupTime: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Driver Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Driver *
            </label>
            <select
              value={tripData.driverId}
              onChange={(e) => setTripData(prev => ({ ...prev, driverId: e.target.value }))}
              className={cn(
                "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                errors.driverId ? "border-red-300" : "border-slate-300"
              )}
            >
              <option value="">Select a driver</option>
              {drivers.filter(d => d.role === 'driver').map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name} {driver.phone && `(${driver.phone})`}
                </option>
              ))}
            </select>
            {errors.driverId && (
              <p className="text-red-600 text-sm mt-1">{errors.driverId}</p>
            )}
            {selectedDriver && (
              <div className="mt-2 p-3 bg-slate-50 rounded border flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
                  {selectedDriver.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{selectedDriver.name}</p>
                  {selectedDriver.phone && (
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedDriver.phone}
                    </p>
                  )}
                  {selectedDriver.vehicleId && (
                    <p className="text-sm text-slate-600 flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Vehicle: {selectedDriver.vehicleId}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pickup Location */}
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-green-600" />
              <h3 className="font-medium text-slate-900">Pickup Location</h3>
              <Badge variant="outline">Geofence: {tripData.pickupLocation.geofenceRadius}m</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={tripData.pickupLocation.name}
                  onChange={(e) => setTripData(prev => ({
                    ...prev,
                    pickupLocation: { ...prev.pickupLocation, name: e.target.value }
                  }))}
                  className={cn(
                    "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                    errors.pickupName ? "border-red-300" : "border-slate-300"
                  )}
                  placeholder="e.g., Warehouse A"
                />
                {errors.pickupName && (
                  <p className="text-red-600 text-sm mt-1">{errors.pickupName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address
                </label>
                <div className="flex gap-2">
                  <input
                    ref={pickupAddressRef}
                    type="text"
                    value={tripData.pickupLocation.address}
                    onChange={(e) => handleAddressSearch('pickup', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter address"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleGetCurrentLocation('pickup')}
                    disabled={isGettingLocation === 'pickup'}
                  >
                    {isGettingLocation === 'pickup' ? (
                      <Navigation className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={tripData.pickupLocation.lat || ""}
                  onChange={(e) => setTripData(prev => ({
                    ...prev,
                    pickupLocation: { ...prev.pickupLocation, lat: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="40.7128"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={tripData.pickupLocation.lng || ""}
                  onChange={(e) => setTripData(prev => ({
                    ...prev,
                    pickupLocation: { ...prev.pickupLocation, lng: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="-74.0060"
                />
              </div>
            </div>
          </div>

          {/* Destination Location */}
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-slate-900">Destination Location</h3>
              <Badge variant="outline">Geofence: {tripData.destinationLocation.geofenceRadius}m</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  value={tripData.destinationLocation.name}
                  onChange={(e) => setTripData(prev => ({
                    ...prev,
                    destinationLocation: { ...prev.destinationLocation, name: e.target.value }
                  }))}
                  className={cn(
                    "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                    errors.destName ? "border-red-300" : "border-slate-300"
                  )}
                  placeholder="e.g., Customer Site B"
                />
                {errors.destName && (
                  <p className="text-red-600 text-sm mt-1">{errors.destName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address
                </label>
                <div className="flex gap-2">
                  <input
                    ref={destAddressRef}
                    type="text"
                    value={tripData.destinationLocation.address}
                    onChange={(e) => handleAddressSearch('destination', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter address"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleGetCurrentLocation('destination')}
                    disabled={isGettingLocation === 'destination'}
                  >
                    {isGettingLocation === 'destination' ? (
                      <Navigation className="h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={tripData.destinationLocation.lat || ""}
                  onChange={(e) => setTripData(prev => ({
                    ...prev,
                    destinationLocation: { ...prev.destinationLocation, lat: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="40.7589"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={tripData.destinationLocation.lng || ""}
                  onChange={(e) => setTripData(prev => ({
                    ...prev,
                    destinationLocation: { ...prev.destinationLocation, lng: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="-73.9851"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="h-5 w-5 text-slate-600" />
              <h3 className="font-medium text-slate-900">Vehicle Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Truck Number *
                </label>
                <input
                  type="text"
                  value={tripData.vehicle.truckNumber}
                  onChange={(e) => setTripData(prev => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, truckNumber: e.target.value }
                  }))}
                  className={cn(
                    "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
                    errors.truckNumber ? "border-red-300" : "border-slate-300"
                  )}
                  placeholder="e.g., TRK-001"
                />
                {errors.truckNumber && (
                  <p className="text-red-600 text-sm mt-1">{errors.truckNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Trailer Number
                </label>
                <input
                  type="text"
                  value={tripData.vehicle.trailerNumber}
                  onChange={(e) => setTripData(prev => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, trailerNumber: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., TRL-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={tripData.vehicle.type}
                  onChange={(e) => setTripData(prev => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, type: e.target.value as Vehicle['type'] }
                  }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                  <option value="trailer">Trailer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={tripData.notes}
              onChange={(e) => setTripData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any special instructions or notes for this trip..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600">
            <p>Geofence check-ins will be automatically monitored for both locations.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-1" />
              Create Trip
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

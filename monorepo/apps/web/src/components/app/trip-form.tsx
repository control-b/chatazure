"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Truck, 
  User, 
  Phone, 
  FileText,
  Navigation,
  Calendar,
  Clock
} from "lucide-react";
import type { Trip, Location, Vehicle, User as UserType } from "@/types";

interface TripFormProps {
  onSubmit: (tripData: Partial<Trip>) => Promise<void>;
  onCancel: () => void;
  drivers: UserType[];
  className?: string;
}

export function TripForm({ 
  onSubmit, 
  onCancel, 
  drivers, 
  className 
}: TripFormProps) {
  const [formData, setFormData] = useState({
    poNumber: "",
    driverId: "",
    pickupLocation: {
      name: "",
      address: "",
      lat: 0,
      lng: 0,
      geofenceRadius: 150
    } as Location,
    destinationLocation: {
      name: "",
      address: "",
      lat: 0,
      lng: 0,
      geofenceRadius: 150
    } as Location,
    vehicle: {
      truckNumber: "",
      trailerNumber: "",
      type: "truck" as const
    } as Vehicle,
    scheduledPickup: "",
    scheduledDelivery: "",
    notes: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.poNumber.trim()) {
      newErrors.poNumber = "PO Number is required";
    }
    if (!formData.driverId) {
      newErrors.driverId = "Driver must be selected";
    }
    if (!formData.pickupLocation.name.trim()) {
      newErrors.pickupName = "Pickup location name is required";
    }
    if (!formData.destinationLocation.name.trim()) {
      newErrors.destName = "Destination name is required";
    }
    if (!formData.vehicle.truckNumber.trim()) {
      newErrors.truckNumber = "Truck number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Failed to create trip:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationSearch = async (field: 'pickup' | 'destination', query: string) => {
    // TODO: Integrate with geocoding service (Google Maps, Mapbox, etc.)
    // For now, just update the name
    if (field === 'pickup') {
      setFormData(prev => ({
        ...prev,
        pickupLocation: { ...prev.pickupLocation, name: query }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        destinationLocation: { ...prev.destinationLocation, name: query }
      }));
    }
  };

  const selectedDriver = drivers.find(d => d.id === formData.driverId);

  return (
    <div className={cn("bg-slate-900 rounded-lg border border-slate-700", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-semibold text-white">Create New Trip</h2>
        <p className="text-sm text-slate-400 mt-1">
          Set up a new delivery trip with pickup and destination details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Trip Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            Trip Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                PO Number *
              </label>
              <input
                type="text"
                value={formData.poNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter PO number"
              />
              {errors.poNumber && (
                <p className="text-red-400 text-xs mt-1">{errors.poNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Driver *
              </label>
              <select
                value={formData.driverId}
                onChange={(e) => setFormData(prev => ({ ...prev, driverId: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a driver</option>
                {drivers.filter(d => d.role === 'driver').map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} {driver.phone && `(${driver.phone})`}
                  </option>
                ))}
              </select>
              {errors.driverId && (
                <p className="text-red-400 text-xs mt-1">{errors.driverId}</p>
              )}
            </div>
          </div>

          {selectedDriver && (
            <div className="p-3 bg-slate-800 rounded-lg border border-slate-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">{selectedDriver.name}</p>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    {selectedDriver.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedDriver.phone}
                      </span>
                    )}
                    {selectedDriver.vehicleId && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        Vehicle: {selectedDriver.vehicleId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pickup Location */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-400" />
            Pickup Location
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Location Name *
              </label>
              <input
                type="text"
                value={formData.pickupLocation.name}
                onChange={(e) => handleLocationSearch('pickup', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Warehouse A, Distribution Center"
              />
              {errors.pickupName && (
                <p className="text-red-400 text-xs mt-1">{errors.pickupName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Scheduled Pickup
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledPickup}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledPickup: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.pickupLocation.address || ""}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pickupLocation: { ...prev.pickupLocation, address: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter full address"
            />
          </div>
        </div>

        {/* Destination Location */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Navigation className="h-5 w-5 text-red-400" />
            Destination
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Location Name *
              </label>
              <input
                type="text"
                value={formData.destinationLocation.name}
                onChange={(e) => handleLocationSearch('destination', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Customer Site B, Retail Store"
              />
              {errors.destName && (
                <p className="text-red-400 text-xs mt-1">{errors.destName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Scheduled Delivery
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledDelivery}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledDelivery: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.destinationLocation.address || ""}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                destinationLocation: { ...prev.destinationLocation, address: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter full address"
            />
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Truck className="h-5 w-5 text-orange-400" />
            Vehicle Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Truck Number *
              </label>
              <input
                type="text"
                value={formData.vehicle.truckNumber}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, truckNumber: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., TRK-001"
              />
              {errors.truckNumber && (
                <p className="text-red-400 text-xs mt-1">{errors.truckNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Trailer Number
              </label>
              <input
                type="text"
                value={formData.vehicle.trailerNumber || ""}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, trailerNumber: e.target.value }
                }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., TRL-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Vehicle Type
              </label>
              <select
                value={formData.vehicle.type}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, type: e.target.value as Vehicle['type'] }
                }))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Trip Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any special instructions or notes for this trip..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? "Creating Trip..." : "Create Trip"}
          </Button>
        </div>
      </form>
    </div>
  );
}

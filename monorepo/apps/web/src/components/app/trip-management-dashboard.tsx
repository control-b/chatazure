"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Truck,
  Clock,
  User,
  Package,
  FileText,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Timer,
  Navigation,
  Eye,
} from "lucide-react";
import type { Trip, User as UserType } from "@/types/index";
import { TripCreationModal } from "./trip-creation-modal";

type TripStatus = Trip['status'];

interface TripManagementDashboardProps {
  trips: Trip[];
  drivers: UserType[];
  onCreateTrip: (tripData: any) => void;
  onUpdateTrip: (tripId: string, updates: Partial<Trip>) => void;
  onViewTrip: (trip: Trip) => void;
  className?: string;
}

interface TripFilters {
  status: TripStatus | 'all';
  driverId: string;
  search: string;
}

export function TripManagementDashboard({
  trips,
  drivers,
  onCreateTrip,
  onUpdateTrip,
  onViewTrip,
  className,
}: TripManagementDashboardProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState<TripFilters>({
    status: 'all',
    driverId: '',
    search: '',
  });

  const filteredTrips = trips.filter(trip => {
    if (filters.status !== 'all' && trip.status !== filters.status) {
      return false;
    }
    if (filters.driverId && trip.driverId !== filters.driverId) {
      return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        trip.poNumber.toLowerCase().includes(searchLower) ||
        trip.pickupLocation.name.toLowerCase().includes(searchLower) ||
        trip.destinationLocation.name.toLowerCase().includes(searchLower) ||
        drivers.find(d => d.id === trip.driverId)?.name.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getStatusColor = (status: TripStatus) => {
    switch (status) {
      case 'created':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800';
      case 'arrived_pickup':
        return 'bg-purple-100 text-purple-800';
      case 'arrived_destination':
        return 'bg-indigo-100 text-indigo-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status: TripStatus) => {
    switch (status) {
      case 'created':
        return <Timer className="h-3 w-3" />;
      case 'in_transit':
        return <Navigation className="h-3 w-3" />;
      case 'arrived_pickup':
        return <MapPin className="h-3 w-3" />;
      case 'arrived_destination':
        return <MapPin className="h-3 w-3" />;
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'cancelled':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getCheckInStatus = (trip: Trip) => {
    const hasPickupCheckIn = trip.checkIns?.some(c => c.type === 'pickup');
    const hasDeliveryCheckIn = trip.checkIns?.some(c => c.type === 'delivery');
    
    if (hasDeliveryCheckIn) {
      return { text: 'Delivered', color: 'text-green-600' };
    } else if (hasPickupCheckIn) {
      return { text: 'Picked Up', color: 'text-blue-600' };
    } else {
      return { text: 'Awaiting Pickup', color: 'text-yellow-600' };
    }
  };

  const getDriverName = (driverId: string) => {
    return drivers.find(d => d.id === driverId)?.name || 'Unknown Driver';
  };

  const getTripProgress = (trip: Trip) => {
    if (trip.status === 'completed') return 100;
    if (trip.status === 'cancelled') return 0;
    
    const hasPickup = trip.checkIns?.some(c => c.type === 'pickup');
    const hasDelivery = trip.checkIns?.some(c => c.type === 'delivery');
    
    if (hasDelivery) return 100;
    if (hasPickup) return 60;
    if (trip.status === 'in_transit') return 30;
    if (trip.status === 'arrived_pickup') return 50;
    if (trip.status === 'arrived_destination') return 90;
    return 10;
  };

  const statsData = {
    total: trips.length,
    created: trips.filter(t => t.status === 'created').length,
    inTransit: trips.filter(t => t.status === 'in_transit').length,
    arrivedPickup: trips.filter(t => t.status === 'arrived_pickup').length,
    arrivedDestination: trips.filter(t => t.status === 'arrived_destination').length,
    completed: trips.filter(t => t.status === 'completed').length,
    cancelled: trips.filter(t => t.status === 'cancelled').length,
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trip Management</h1>
          <p className="text-slate-600">Monitor and manage trucking trips with geofence tracking</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Trip
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Trips</p>
              <p className="text-2xl font-bold text-slate-900">{statsData.total}</p>
            </div>
            <Package className="h-8 w-8 text-slate-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Created</p>
              <p className="text-2xl font-bold text-yellow-600">{statsData.created}</p>
            </div>
            <Timer className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">In Transit</p>
              <p className="text-2xl font-bold text-blue-600">{statsData.inTransit}</p>
            </div>
            <Navigation className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{statsData.completed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{statsData.cancelled}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search trips..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as TripStatus | 'all' }))}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="created">Created</option>
            <option value="in_transit">In Transit</option>
            <option value="arrived_pickup">Arrived at Pickup</option>
            <option value="arrived_destination">Arrived at Destination</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Driver Filter */}
          <select
            value={filters.driverId}
            onChange={(e) => setFilters(prev => ({ ...prev, driverId: e.target.value }))}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Drivers</option>
            {drivers.filter(d => d.role === 'driver').map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          <Button
            variant="outline"
            onClick={() => setFilters({ status: 'all', driverId: '', search: '' })}
            className="justify-self-end"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Trips Table/List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {filteredTrips.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No trips found</h3>
            <p className="text-slate-600 mb-4">
              {trips.length === 0 
                ? "Get started by creating your first trip."
                : "Try adjusting your filters or search terms."
              }
            </p>
            {trips.length === 0 && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Trip
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 font-medium text-slate-700">Trip Details</th>
                  <th className="text-left p-4 font-medium text-slate-700">Route</th>
                  <th className="text-left p-4 font-medium text-slate-700">Driver</th>
                  <th className="text-left p-4 font-medium text-slate-700">Status</th>
                  <th className="text-left p-4 font-medium text-slate-700">Progress</th>
                  <th className="text-left p-4 font-medium text-slate-700">Check-ins</th>
                  <th className="text-left p-4 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTrips.map((trip) => {
                  const checkInStatus = getCheckInStatus(trip);
                  const progress = getTripProgress(trip);
                  
                  return (
                    <tr key={trip.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-slate-900">#{trip.poNumber}</p>
                          {trip.createdAt && (
                            <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {new Date(trip.createdAt).toLocaleDateString()}
                            </p>
                          )}
                          {trip.vehicle && (
                            <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                              <Truck className="h-3 w-3" />
                              {trip.vehicle.truckNumber}
                              {trip.vehicle.trailerNumber && ` / ${trip.vehicle.trailerNumber}`}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-green-600" />
                            <span className="text-sm">{trip.pickupLocation.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-blue-600" />
                            <span className="text-sm">{trip.destinationLocation.name}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {getDriverName(trip.driverId).charAt(0)}
                          </div>
                          <span className="text-sm font-medium">{getDriverName(trip.driverId)}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <Badge className={cn("flex items-center gap-1", getStatusColor(trip.status))}>
                          {getStatusIcon(trip.status)}
                          {trip.status.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                progress === 100 ? "bg-green-600" : 
                                progress >= 60 ? "bg-blue-600" : 
                                progress >= 30 ? "bg-yellow-600" : "bg-slate-400"
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={cn("text-sm font-medium", checkInStatus.color)}>
                          {checkInStatus.text}
                        </span>
                        {trip.checkIns && trip.checkIns.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">
                            {trip.checkIns.length} check-in{trip.checkIns.length !== 1 ? 's' : ''}
                          </p>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewTrip(trip)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {trip.documents && trip.documents.length > 0 && (
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}

                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trip Creation Modal */}
      <TripCreationModal
        isOpen={isCreateModalOpen}
        drivers={drivers}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={onCreateTrip}
      />
    </div>
  );
}

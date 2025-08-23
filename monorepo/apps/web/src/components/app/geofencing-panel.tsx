"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Navigation,
  Truck,
  Settings,
  Download,
  Filter,
} from "lucide-react";

interface Geofence {
  id: string;
  name: string;
  type: "pickup" | "delivery" | "depot" | "restricted";
  status: "active" | "inactive";
  coordinates: Array<[number, number]>; // [lat, lon] pairs for polygon
  center: [number, number]; // [lat, lon]
  radius?: number; // for circular geofences
  address?: string;
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
}

interface GeoEvent {
  id: string;
  type: "enter" | "exit";
  geofenceId: string;
  geofenceName: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  timestamp: string;
  location: [number, number];
}

interface GeofencingPanelProps {
  geofences: Geofence[];
  geoEvents: GeoEvent[];
  selectedGeofenceId?: string;
  onGeofenceSelect: (geofenceId: string) => void;
  onGeofenceCreate: () => void;
  onGeofenceEdit: (geofenceId: string) => void;
  onGeofenceDelete: (geofenceId: string) => void;
  onGeofenceToggle: (geofenceId: string) => void;
  className?: string;
}

const geofenceTypeColors = {
  pickup: "bg-green-100 text-green-800 border-green-200",
  delivery: "bg-blue-100 text-blue-800 border-blue-200",
  depot: "bg-purple-100 text-purple-800 border-purple-200",
  restricted: "bg-red-100 text-red-800 border-red-200",
};

const eventTypeIcons = {
  enter: CheckCircle,
  exit: AlertTriangle,
};

const eventTypeColors = {
  enter: "text-green-600",
  exit: "text-orange-600",
};

export function GeofencingPanel({
  geofences,
  geoEvents,
  selectedGeofenceId,
  onGeofenceSelect,
  onGeofenceCreate,
  onGeofenceEdit,
  onGeofenceDelete,
  onGeofenceToggle,
  className,
}: GeofencingPanelProps) {
  const [activeTab, setActiveTab] = useState<"geofences" | "events">(
    "geofences"
  );
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [eventFilter, setEventFilter] = useState<"all" | "enter" | "exit">(
    "all"
  );

  const filteredGeofences = geofences.filter((geofence) => {
    switch (filter) {
      case "active":
        return geofence.status === "active";
      case "inactive":
        return geofence.status === "inactive";
      default:
        return true;
    }
  });

  const filteredEvents = geoEvents
    .filter((event) => {
      switch (eventFilter) {
        case "enter":
          return event.type === "enter";
        case "exit":
          return event.type === "exit";
        default:
          return true;
      }
    })
    .slice(0, 50); // Show last 50 events

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderGeofence = (geofence: Geofence) => {
    const isSelected = selectedGeofenceId === geofence.id;

    return (
      <div
        key={geofence.id}
        className={cn(
          "p-3 border rounded-lg cursor-pointer transition-colors group",
          isSelected
            ? "border-blue-500 bg-blue-50"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        )}
        onClick={() => onGeofenceSelect(geofence.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-medium text-slate-900 truncate">
                {geofence.name}
              </h4>
              <Badge
                variant="outline"
                className={cn("text-xs", geofenceTypeColors[geofence.type])}
              >
                {geofence.type}
              </Badge>
              <Badge
                variant={geofence.status === "active" ? "default" : "secondary"}
                className="text-xs"
              >
                {geofence.status}
              </Badge>
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              {geofence.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{geofence.address}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Created {formatDateTime(geofence.createdAt)}</span>
                </div>

                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{geofence.triggerCount} events</span>
                </div>
              </div>

              {geofence.lastTriggered && (
                <div className="flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  <span>Last: {formatDateTime(geofence.lastTriggered)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onGeofenceToggle(geofence.id);
              }}
              title={geofence.status === "active" ? "Deactivate" : "Activate"}
            >
              {geofence.status === "active" ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onGeofenceEdit(geofence.id);
              }}
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onGeofenceDelete(geofence.id);
              }}
              title="Delete"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderGeoEvent = (event: GeoEvent) => {
    const EventIcon = eventTypeIcons[event.type];

    return (
      <div
        key={event.id}
        className="p-3 border-b border-slate-100 last:border-b-0"
      >
        <div className="flex items-start gap-3">
          <EventIcon
            className={cn("h-5 w-5 mt-0.5", eventTypeColors[event.type])}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-slate-900">
                {event.driverName}
              </span>
              <span className="text-xs text-slate-500">
                {event.type === "enter" ? "entered" : "exited"}
              </span>
              <span className="text-xs font-medium text-slate-700">
                {event.geofenceName}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Truck className="h-3 w-3" />
                <span>Vehicle {event.vehicleId}</span>
              </div>

              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDateTime(event.timestamp)}</span>
              </div>

              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>
                  {event.location[0].toFixed(4)}, {event.location[1].toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Geofencing</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={onGeofenceCreate}>
              <Plus className="h-4 w-4 mr-1" />
              New Zone
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === "geofences"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => setActiveTab("geofences")}
          >
            Zones ({geofences.length})
          </button>
          <button
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === "events"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
            onClick={() => setActiveTab("events")}
          >
            Events ({geoEvents.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-slate-200">
        {activeTab === "geofences" ? (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Button
              variant={filter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "active" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("active")}
            >
              Active
            </Button>
            <Button
              variant={filter === "inactive" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("inactive")}
            >
              Inactive
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <Button
              variant={eventFilter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setEventFilter("all")}
            >
              All
            </Button>
            <Button
              variant={eventFilter === "enter" ? "default" : "ghost"}
              size="sm"
              onClick={() => setEventFilter("enter")}
            >
              Entries
            </Button>
            <Button
              variant={eventFilter === "exit" ? "default" : "ghost"}
              size="sm"
              onClick={() => setEventFilter("exit")}
            >
              Exits
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === "geofences" ? (
          <div className="p-4 space-y-3">
            {filteredGeofences.length > 0 ? (
              filteredGeofences.map(renderGeofence)
            ) : (
              <div className="text-center py-8 text-slate-500">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm mb-2">No geofences found</p>
                <Button size="sm" onClick={onGeofenceCreate}>
                  Create your first geofence
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEvents.length > 0 ? (
              filteredEvents.map(renderGeoEvent)
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm">No events found</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Truck,
  MapPin,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Navigation,
  Bell,
  Package,
  User,
  MessageSquare,
  ChevronRight,
  Fuel,
  Calendar,
} from "lucide-react";
import { MobileCheckIn } from "@/components/mobile/check-in-mobile";
import { MobileNavigation } from "@/components/mobile/navigation-mobile";
import { useMobileGeofence } from "@/lib/mobile-geofence";

// Mock data types
interface ActiveTrip {
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
  checkIns: Array<{
    id: string;
    type: 'pickup' | 'delivery';
    timestamp: string;
    location: { lat: number; lng: number; accuracy: number };
    method: 'auto' | 'manual';
    distance: number;
    photos?: string[];
    notes?: string;
  }>;
  estimatedPickup?: string;
  estimatedDelivery?: string;
}

interface Notification {
  id: string;
  type: 'trip' | 'document' | 'system' | 'chat';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  urgent?: boolean;
}

interface DashboardStats {
  todayTrips: number;
  completedTrips: number;
  pendingDocuments: number;
  unreadMessages: number;
}

interface MobileDashboardProps {
  user?: {
    id: string;
    name: string;
    role: 'driver' | 'dispatcher' | 'admin';
    avatar?: string;
  };
  className?: string;
}

export function MobileDashboard({ user, className }: MobileDashboardProps) {
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    todayTrips: 0,
    completedTrips: 0,
    pendingDocuments: 0,
    unreadMessages: 0,
  });
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  const { status: geofenceStatus, permissionStatus } = useMobileGeofence();

  // Mock data loading
  useEffect(() => {
    // Load mock active trip for driver
    if (user?.role === 'driver') {
      setActiveTrip({
        id: 'trip-001',
        poNumber: 'PO-2024-001',
        driverName: user.name,
        driverPhone: '+1-555-0123',
        truckNumber: 'TRK-001',
        trailerNumber: 'TRL-101',
        pickupLocation: {
          name: 'Walmart Distribution Center',
          address: '123 Logistics Way, Atlanta, GA 30309',
          lat: 33.7490,
          lng: -84.3880,
        },
        deliveryLocation: {
          name: 'Target Store #1234',
          address: '456 Retail Blvd, Nashville, TN 37201',
          lat: 36.1627,
          lng: -86.7816,
        },
        status: 'created',
        estimatedPickup: '2024-01-15T10:00:00Z',
        estimatedDelivery: '2024-01-15T16:00:00Z',
        checkIns: [],
      });
    }

    // Load mock stats
    setStats({
      todayTrips: user?.role === 'driver' ? 2 : 15,
      completedTrips: user?.role === 'driver' ? 1 : 12,
      pendingDocuments: 3,
      unreadMessages: 5,
    });

    // Load mock notifications
    setNotifications([
      {
        id: 'notif-1',
        type: 'trip',
        title: 'Trip Assignment',
        message: 'New trip PO-2024-001 assigned for pickup at 10:00 AM',
        timestamp: '2024-01-15T08:30:00Z',
        read: false,
        urgent: true,
      },
      {
        id: 'notif-2',
        type: 'document',
        title: 'Document Ready',
        message: 'BOL for trip PO-2024-001 is ready for signature',
        timestamp: '2024-01-15T08:15:00Z',
        read: false,
      },
      {
        id: 'notif-3',
        type: 'chat',
        title: 'New Message',
        message: 'Dispatcher: "Please confirm ETA for delivery"',
        timestamp: '2024-01-15T08:00:00Z',
        read: true,
      },
    ]);
  }, [user]);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  }, []);

  const handleCheckIn = async (checkInData: any) => {
    console.log('Check-in data:', checkInData);
    // In real app, send to backend
    
    // Update local state
    if (activeTrip) {
      const newStatus: ActiveTrip['status'] = checkInData.type === 'pickup' ? 'arrived_pickup' : 'arrived_delivery';
      const updatedTrip: ActiveTrip = {
        ...activeTrip,
        checkIns: [...activeTrip.checkIns, { ...checkInData, id: Date.now().toString() }],
        status: newStatus,
      };
      setActiveTrip(updatedTrip);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const urgentNotifications = notifications.filter(n => n.urgent && !n.read);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={cn("min-h-screen bg-slate-50 pb-20", className)}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {user?.role === 'driver' ? 'Driver Dashboard' : 'Dashboard'}
            </h1>
            <p className="text-sm text-slate-600">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {urgentNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllNotifications(true)}
                className="relative"
              >
                <Bell className="h-5 w-5 text-red-600" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {urgentNotifications.length}
                </span>
              </Button>
            )}
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="h-8 w-8 bg-slate-200 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-slate-600" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.todayTrips}</div>
                <div className="text-sm text-slate-600">
                  {user?.role === 'driver' ? 'My Trips' : 'Active Trips'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.completedTrips}</div>
                <div className="text-sm text-slate-600">Completed</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FileText className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.pendingDocuments}</div>
                <div className="text-sm text-slate-600">Documents</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{stats.unreadMessages}</div>
                <div className="text-sm text-slate-600">Messages</div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Location & Monitoring</h3>
            <div className={cn(
              "text-xs px-2 py-1 rounded-full",
              permissionStatus === 'granted' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}>
              {permissionStatus === 'granted' ? 'Active' : 'Disabled'}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-slate-600" />
              <span className="text-slate-900">
                {currentLocation ? 'Location available' : 'Getting location...'}
              </span>
            </div>
            
            {user?.role === 'driver' && (
              <div className="flex items-center gap-2 text-sm">
                <Navigation className="h-4 w-4 text-slate-600" />
                <span className="text-slate-900">
                  Auto check-in: {geofenceStatus.isWatching ? 'On' : 'Off'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Active Trip (Driver Only) */}
        {user?.role === 'driver' && activeTrip && (
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Active Trip</h3>
            <MobileCheckIn
              trip={activeTrip}
              currentLocation={currentLocation || undefined}
              onCheckIn={handleCheckIn}
              onTakePhoto={() => console.log('Take photo')}
              onCallDispatch={() => window.open('tel:+1234567890', '_self')}
            />
          </div>
        )}

        {/* Recent Notifications */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Recent Updates</h3>
            {unreadNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllNotifications(true)}
              >
                View All ({unreadNotifications.length})
              </Button>
            )}
          </div>
          
          <div className="divide-y divide-slate-200">
            {notifications.slice(0, 3).map((notification) => {
              const Icon = notification.type === 'trip' ? Truck :
                          notification.type === 'document' ? FileText :
                          notification.type === 'chat' ? MessageSquare : Bell;
              
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 flex items-start gap-3",
                    !notification.read && "bg-blue-50"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    notification.urgent ? "bg-red-100" : "bg-slate-100"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      notification.urgent ? "text-red-600" : "text-slate-600"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900 truncate">
                        {notification.title}
                      </h4>
                      {notification.urgent && (
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      {!notification.read && (
                        <div className="h-2 w-2 bg-blue-600 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {formatTime(notification.timestamp)} • {formatDate(notification.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto p-4 justify-start">
              <FileText className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Documents</div>
                <div className="text-xs text-slate-600">View & sign</div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start">
              <MessageSquare className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Chat</div>
                <div className="text-xs text-slate-600">Team messages</div>
              </div>
            </Button>

            {user?.role === 'driver' && (
              <>
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <Fuel className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Fuel Log</div>
                    <div className="text-xs text-slate-600">Record fuel</div>
                  </div>
                </Button>
                
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <Calendar className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Schedule</div>
                    <div className="text-xs text-slate-600">View trips</div>
                  </div>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation
        user={user}
        onSignOut={() => console.log('Sign out')}
      />

      {/* Notifications Modal */}
      {showAllNotifications && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed inset-x-0 top-0 h-full bg-white">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold">Notifications</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllNotifications(false)}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="overflow-y-auto h-full pb-4">
              {notifications.map((notification) => {
                const Icon = notification.type === 'trip' ? Truck :
                            notification.type === 'document' ? FileText :
                            notification.type === 'chat' ? MessageSquare : Bell;
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 border-b border-slate-200 flex items-start gap-3",
                      !notification.read && "bg-blue-50"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg flex-shrink-0",
                      notification.urgent ? "bg-red-100" : "bg-slate-100"
                    )}>
                      <Icon className={cn(
                        "h-4 w-4",
                        notification.urgent ? "text-red-600" : "text-slate-600"
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-900">
                          {notification.title}
                        </h4>
                        {notification.urgent && (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        {!notification.read && (
                          <div className="h-2 w-2 bg-blue-600 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatTime(notification.timestamp)} • {formatDate(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

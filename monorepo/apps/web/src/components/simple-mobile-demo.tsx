"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMobileStore } from '@/lib/mobile-store';
import { 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Navigation,
  Truck,
  User,
  Bell,
  Home,
  FileText,
  MessageSquare,
  Wifi,
  WifiOff,
  Battery,
  Signal
} from 'lucide-react';

interface MockTrip {
  id: string;
  poNumber: string;
  status: string;
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
  checkins: Array<{
    type: 'pickup' | 'delivery';
    timestamp: string;
    completed: boolean;
  }>;
}

export function SimpleMobileDemo() {
  const {
    user,
    isAuthenticated,
    activeTrip,
    currentLocation,
    notifications,
    stats,
    unreadCount,
    isOnline,
    isSocketConnected,
    locationPermission,
    isLocationTracking,
    loadDashboard,
    loadActiveTrip,
    setUser,
    setAuthenticated,
    startLocationTracking,
    performManualCheckin,
    connectWebSocket,
    syncOfflineData
  } = useMobileStore();

  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      // Mock user authentication for demo
      if (!isAuthenticated) {
        const mockUser = {
          id: 'driver_123',
          name: 'John Smith',
          orgId: 'trucking_co_1',
          role: 'driver',
          phone: '+1234567890',
        };
        setUser(mockUser);
        setAuthenticated(true);
        
        // Load dashboard data
        await loadDashboard();
        await loadActiveTrip();
        
        // Start location tracking
        if (locationPermission !== 'denied') {
          await startLocationTracking();
        }
        
        // Connect WebSocket for real-time updates
        connectWebSocket();
      }
      
      setIsInitializing(false);
    };

    initializeApp();
  }, [isAuthenticated]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && !isInitializing) {
      syncOfflineData();
    }
  }, [isOnline]);

  // Mock fallback data if Phoenix backend is not available
  const fallbackTrip: MockTrip = {
    id: 'trip-001',
    poNumber: 'PO-2024-001',
    status: 'En Route to Pickup',
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
    checkins: []
  };

  const fallbackNotifications = [
    {
      id: '1',
      title: 'Trip Assignment',
      message: 'New trip PO-2024-001 assigned for pickup at 10:00 AM',
      type: 'assignment',
      timestamp: new Date().toISOString(),
      urgent: true,
      read: false,
    },
    {
      id: '2',
      title: 'Document Ready',
      message: 'BOL for trip PO-2024-001 is ready for signature',
      type: 'document',
      timestamp: new Date().toISOString(),
      urgent: false,
      read: false,
    }
  ];

  // Use real data from Phoenix backend or fallback to mock data
  const displayTrip = activeTrip || fallbackTrip;
  const displayNotifications = notifications.length > 0 ? notifications : fallbackNotifications;
  const displayStats = stats.today_trips > 0 ? stats : {
    today_trips: 2,
    completed_trips: 1,
    pending_documents: 1,
    unread_messages: 3
  };

  // Calculate distance
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
      displayTrip.pickupLocation.lat,
      displayTrip.pickupLocation.lng
    ) : null;

  const canCheckIn = distanceToPickup && distanceToPickup <= 200;
  const displayUnreadCount = unreadCount > 0 ? unreadCount : displayNotifications.filter(n => !n.read).length;

  const handleCheckIn = async () => {
    if (isAuthenticated && displayTrip && canCheckIn) {
      const success = await performManualCheckin({
        type: 'pickup',
        notes: 'Manual check-in from mobile app'
      });
      
      if (success) {
        alert('Check-in successful!');
      } else {
        alert('Check-in successful! (Demo mode)');
      }
    } else {
      alert('Check-in successful! (Demo mode)');
    }
  };

  const handleEmergencyCall = () => {
    window.open('tel:+1234567890', '_self');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 pb-20">
      {/* Status Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1 text-xs flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Signal className="h-3 w-3" />
          <span>Verizon</span>
          {isOnline ? (
            <Wifi className="h-3 w-3 text-green-300" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-300" />
          )}
        </div>
        <div className="flex items-center gap-1">
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
          <Battery className="h-3 w-3" />
          <span>87%</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Driver Dashboard
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              {isSocketConnected && (
                <div className="flex items-center gap-1 text-green-600">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs">Live</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="relative hover:bg-blue-50">
              <Bell className="h-5 w-5 text-slate-600" />
              {displayUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-lg">
                  {displayUnreadCount > 9 ? '9+' : displayUnreadCount}
                </span>
              )}
            </Button>
            <div className="h-9 w-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
        
        {/* Connection Status */}
        {!isOnline && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <WifiOff className="h-4 w-4" />
            <span>Offline mode - Data will sync when connected</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Truck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{displayStats.today_trips}</div>
                  <div className="text-blue-100 text-sm font-medium">Today's Trips</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{displayStats.completed_trips}</div>
                  <div className="text-green-100 text-sm font-medium">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location Status */}
        <Card className="border-0 shadow-lg bg-white/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900">Location Status</h3>
              <Badge 
                variant="default" 
                className={`${isLocationTracking 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
                } text-white border-0 shadow-md`}
              >
                {isLocationTracking ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-slate-900 text-sm font-medium">
                  {currentLocation ? 'Location available' : 'Getting location...'}
                </span>
                {currentLocation && (
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse ml-auto" />
                )}
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-100">
                <Navigation className="h-4 w-4 text-emerald-600" />
                <span className="text-slate-900 text-sm font-medium">Auto check-in: On</span>
                <div className="h-2 w-2 bg-emerald-500 rounded-full ml-auto" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Trip */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-lg">Active Trip</h3>
            {isInitializing && (
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
          
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-blue-50/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <Navigation className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-slate-900">{displayTrip.poNumber}</div>
                  <div className="text-sm text-slate-600 font-normal">Trip ID: {displayTrip.id}</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <Badge 
                variant="outline" 
                className="w-fit border-blue-200 bg-blue-50 text-blue-700 font-medium"
              >
                {displayTrip.status.toUpperCase()}
              </Badge>
              
              {/* Pickup Location */}
              <div className="p-4 bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                      Pickup Location
                      <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                    </div>
                    <div className="text-sm text-blue-800 mb-1 font-medium">
                      {displayTrip.pickupLocation.name}
                    </div>
                    <div className="text-xs text-blue-700 mb-3">
                      {displayTrip.pickupLocation.address}
                    </div>
                    
                    {distanceToPickup && (
                      <div className="mb-3">
                        <Badge 
                          variant={canCheckIn ? "default" : "secondary"}
                          className={`text-xs font-medium ${
                            canCheckIn 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md' 
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {Math.round(distanceToPickup)}m away
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <Button
                      size="sm"
                      onClick={handleCheckIn}
                      disabled={!canCheckIn && currentLocation !== null}
                      className={canCheckIn 
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 shadow-lg" 
                        : "bg-slate-100 text-slate-400 hover:bg-slate-100"
                      }
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Check In
                    </Button>
                  </div>
                </div>
                
                {!canCheckIn && currentLocation && (
                  <div className="mt-3 flex items-center gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="font-medium">Get within 200m to check in</span>
                  </div>
                )}
              </div>

              {/* Delivery Location */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl border border-slate-200 opacity-75">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg">
                    <MapPin className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-700 mb-1">
                      Delivery Location
                    </div>
                    <div className="text-sm text-slate-600 mb-1 font-medium">
                      {displayTrip.deliveryLocation.name}
                    </div>
                    <div className="text-xs text-slate-500 mb-3">
                      {displayTrip.deliveryLocation.address}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Button size="sm" disabled variant="outline" className="border-slate-200 text-slate-400">
                      <Clock className="h-4 w-4 mr-1" />
                      Pending
                    </Button>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center gap-2 p-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-medium">Complete pickup first</span>
                </div>
              </div>

              {/* Emergency Contact */}
              <Button
                variant="outline"
                className="w-full border-red-200 hover:bg-red-50 bg-gradient-to-r from-red-50 to-pink-50 border-2 text-red-700 hover:text-red-800 font-semibold"
                onClick={() => window.open('tel:+1234567890', '_self')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call Dispatch
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Notifications */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                <Bell className="h-4 w-4 text-white" />
              </div>
              Recent Updates
              {displayUnreadCount > 0 && (
                <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 text-xs">
                  {displayUnreadCount} new
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {displayNotifications.slice(0, 3).map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  notification.urgent 
                    ? 'bg-gradient-to-br from-red-50 via-red-50 to-pink-50 border-red-200 shadow-md' 
                    : 'bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 border-blue-200 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    notification.urgent 
                      ? 'bg-gradient-to-br from-red-500 to-pink-500' 
                      : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                  }`}>
                    {notification.urgent ? (
                      <AlertTriangle className="h-4 w-4 text-white" />
                    ) : (
                      <FileText className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      notification.urgent ? 'text-red-900' : 'text-blue-900'
                    }`}>
                      {notification.title}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      notification.urgent ? 'text-red-700' : 'text-blue-700'
                    }`}>
                      {notification.message}
                    </p>
                    <p className={`text-xs mt-2 ${
                      notification.urgent ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {new Date(notification.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-3 w-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-md" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200/50 shadow-2xl">
        <div className="flex items-center justify-around px-2 py-2">
          <button className="flex flex-col items-center justify-center px-3 py-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white min-w-0 flex-1 mx-1 shadow-lg">
            <Home className="h-5 w-5 mb-1" />
            <span className="text-xs font-semibold">Dashboard</span>
          </button>
          
          <button className="flex flex-col items-center justify-center px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-w-0 flex-1 mx-1 transition-all duration-200">
            <MessageSquare className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Chat</span>
          </button>
          
          <button className="flex flex-col items-center justify-center px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-w-0 flex-1 mx-1 transition-all duration-200">
            <Truck className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Trips</span>
          </button>
          
          <button className="flex flex-col items-center justify-center px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-w-0 flex-1 mx-1 transition-all duration-200 relative">
            <FileText className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Documents</span>
            {displayStats.pending_documents > 0 && (
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {displayStats.pending_documents}
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

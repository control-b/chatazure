import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import apiClient from './mobile-api-client';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

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
  status: string;
  geofences: any[];
  checkins: any[];
  next_checkin_type?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  timestamp: string;
  read: boolean;
  urgent?: boolean;
  data?: any;
}

interface User {
  id: string;
  name: string;
  orgId: string;
  role: string;
  phone?: string;
  avatar?: string;
}

interface GeofenceEvent {
  id: string;
  type: 'enter' | 'exit';
  geofence_id: string;
  geofence_name: string;
  timestamp: string;
  distance: number;
  auto_checkin?: boolean;
}

interface MobileStore {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // Trip state
  activeTrip: Trip | null;
  isLoadingTrip: boolean;
  
  // Location state
  currentLocation: Location | null;
  locationPermission: 'granted' | 'denied' | 'prompt' | null;
  isLocationTracking: boolean;
  geofenceEvents: GeofenceEvent[];
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  isLoadingNotifications: boolean;
  
  // Documents
  pendingDocuments: any[];
  isLoadingDocuments: boolean;
  
  // Connection state
  isOnline: boolean;
  isSocketConnected: boolean;
  lastSync: string | null;
  
  // Dashboard stats
  stats: {
    today_trips: number;
    completed_trips: number;
    pending_documents: number;
    unread_messages: number;
  };
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  
  // Trip actions
  setActiveTrip: (trip: Trip | null) => void;
  loadActiveTrip: () => Promise<void>;
  createTrip: (tripData: any) => Promise<boolean>;
  
  // Location actions
  setCurrentLocation: (location: Location) => void;
  setLocationPermission: (permission: 'granted' | 'denied' | 'prompt') => void;
  startLocationTracking: () => Promise<boolean>;
  stopLocationTracking: () => void;
  updateLocation: (location: Omit<Location, 'timestamp'>) => Promise<void>;
  addGeofenceEvent: (event: GeofenceEvent) => void;
  
  // Notification actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  
  // Document actions
  setPendingDocuments: (documents: any[]) => void;
  loadPendingDocuments: () => Promise<void>;
  
  // Connection actions
  setOnline: (online: boolean) => void;
  setSocketConnected: (connected: boolean) => void;
  updateLastSync: () => void;
  
  // Dashboard actions
  setStats: (stats: any) => void;
  loadDashboard: () => Promise<void>;
  
  // Check-in actions
  performManualCheckin: (data: {
    type: string;
    notes?: string;
    photos?: string[];
  }) => Promise<boolean>;
  
  // Real-time actions
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  
  // Utility actions
  reset: () => void;
  syncOfflineData: () => Promise<void>;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  activeTrip: null,
  isLoadingTrip: false,
  currentLocation: null,
  locationPermission: null,
  isLocationTracking: false,
  geofenceEvents: [],
  notifications: [],
  unreadCount: 0,
  isLoadingNotifications: false,
  pendingDocuments: [],
  isLoadingDocuments: false,
  isOnline: true,
  isSocketConnected: false,
  lastSync: null,
  stats: {
    today_trips: 0,
    completed_trips: 0,
    pending_documents: 0,
    unread_messages: 0,
  },
};

export const useMobileStore = create<MobileStore>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,

        // User actions
        setUser: (user) => set({ user }),
        setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

        // Trip actions
        setActiveTrip: (activeTrip) => set({ activeTrip }),
        
        loadActiveTrip: async () => {
          const { user } = get();
          if (!user) return;

          set({ isLoadingTrip: true });
          try {
            const response = await apiClient.getActiveTrip(user.id, user.orgId);
            if (response.success && response.data) {
              set({ activeTrip: response.data.active_trip });
            }
          } catch (error) {
            console.error('Failed to load active trip:', error);
          } finally {
            set({ isLoadingTrip: false });
          }
        },

        createTrip: async (tripData) => {
          try {
            const response = await apiClient.createTrip(tripData);
            if (response.success && response.data) {
              set({ activeTrip: response.data });
              return true;
            }
            return false;
          } catch (error) {
            console.error('Failed to create trip:', error);
            return false;
          }
        },

        // Location actions
        setCurrentLocation: (currentLocation) => {
          set({ currentLocation });
          // Auto-update location to backend if tracking is enabled
          const { isLocationTracking, user } = get();
          if (isLocationTracking && user) {
            get().updateLocation(currentLocation);
          }
        },

        setLocationPermission: (locationPermission) => set({ locationPermission }),

        startLocationTracking: async () => {
          if (!navigator.geolocation) {
            console.error('Geolocation not supported');
            return false;
          }

          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000,
              });
            });

            const location: Location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || undefined,
              heading: position.coords.heading || undefined,
              timestamp: new Date().toISOString(),
            };

            set({
              currentLocation: location,
              locationPermission: 'granted',
              isLocationTracking: true,
            });

            // Start watching position
            const watchId = navigator.geolocation.watchPosition(
              (position) => {
                const newLocation: Location = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  speed: position.coords.speed || undefined,
                  heading: position.coords.heading || undefined,
                  timestamp: new Date().toISOString(),
                };
                get().setCurrentLocation(newLocation);
              },
              (error) => {
                console.error('Location tracking error:', error);
                set({ isLocationTracking: false });
              },
              {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 10000,
              }
            );

            // Store watch ID for cleanup
            (window as any).__locationWatchId = watchId;

            return true;
          } catch (error) {
            console.error('Failed to start location tracking:', error);
            set({ locationPermission: 'denied', isLocationTracking: false });
            return false;
          }
        },

        stopLocationTracking: () => {
          if ((window as any).__locationWatchId) {
            navigator.geolocation.clearWatch((window as any).__locationWatchId);
            delete (window as any).__locationWatchId;
          }
          set({ isLocationTracking: false });
        },

        updateLocation: async (location) => {
          const { user } = get();
          if (!user) return;

          try {
            const locationData = {
              user_id: user.id,
              org_id: user.orgId,
              lat: location.lat,
              lon: location.lng,
              accuracy: location.accuracy,
              timestamp: new Date().toISOString(),
            };

            const response = await apiClient.updateLocation(locationData);
            if (response.success && response.data) {
              // Handle geofence events
              if (response.data.events && response.data.events.length > 0) {
                response.data.events.forEach((event: any) => {
                  get().addGeofenceEvent(event);
                });
              }
            }
          } catch (error) {
            console.error('Failed to update location:', error);
          }
        },

        addGeofenceEvent: (event) => {
          set((state) => ({
            geofenceEvents: [event, ...state.geofenceEvents.slice(0, 49)], // Keep last 50 events
          }));
        },

        // Notification actions
        setNotifications: (notifications) => {
          const unreadCount = notifications.filter(n => !n.read).length;
          set({ notifications, unreadCount });
        },

        addNotification: (notification) => {
          set((state) => ({
            notifications: [notification, ...state.notifications],
            unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
          }));
        },

        markNotificationRead: (notificationId) => {
          set((state) => ({
            notifications: state.notifications.map(n =>
              n.id === notificationId ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          }));
        },

        markAllNotificationsRead: async () => {
          const { notifications, user } = get();
          if (!user) return;

          const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
          if (unreadIds.length === 0) return;

          try {
            await apiClient.markNotificationsRead(unreadIds, user.id);
            set((state) => ({
              notifications: state.notifications.map(n => ({ ...n, read: true })),
              unreadCount: 0,
            }));
          } catch (error) {
            console.error('Failed to mark notifications as read:', error);
          }
        },

        loadNotifications: async () => {
          const { user } = get();
          if (!user) return;

          set({ isLoadingNotifications: true });
          try {
            const response = await apiClient.getNotifications(user.id, user.orgId);
            if (response.success && response.data) {
              get().setNotifications(response.data.notifications || []);
            }
          } catch (error) {
            console.error('Failed to load notifications:', error);
          } finally {
            set({ isLoadingNotifications: false });
          }
        },

        // Document actions
        setPendingDocuments: (pendingDocuments) => set({ pendingDocuments }),

        loadPendingDocuments: async () => {
          const { user } = get();
          if (!user) return;

          set({ isLoadingDocuments: true });
          try {
            const response = await apiClient.getDocuments(user.id, user.orgId, 'pending');
            if (response.success && response.data) {
              set({ pendingDocuments: response.data.documents || [] });
            }
          } catch (error) {
            console.error('Failed to load pending documents:', error);
          } finally {
            set({ isLoadingDocuments: false });
          }
        },

        // Connection actions
        setOnline: (isOnline) => set({ isOnline }),
        setSocketConnected: (isSocketConnected) => set({ isSocketConnected }),
        updateLastSync: () => set({ lastSync: new Date().toISOString() }),

        // Dashboard actions
        setStats: (stats) => set({ stats }),

        loadDashboard: async () => {
          const { user } = get();
          if (!user) return;

          try {
            const response = await apiClient.getDashboard(user.id, user.orgId);
            if (response.success && response.data) {
              const { stats, notifications, location_status } = response.data;
              
              if (stats) get().setStats(stats);
              if (notifications) get().setNotifications(notifications);
              
              get().updateLastSync();
            }
          } catch (error) {
            console.error('Failed to load dashboard:', error);
          }
        },

        // Check-in actions
        performManualCheckin: async (data) => {
          const { user, activeTrip, currentLocation } = get();
          if (!user || !activeTrip || !currentLocation) return false;

          try {
            const checkinData = {
              orgId: user.orgId,
              tripId: activeTrip.id,
              driverId: user.id,
              type: data.type,
              location: {
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                accuracy: currentLocation.accuracy || 0,
              },
              method: 'manual',
              notes: data.notes,
              photos: data.photos,
            };

            const response = await apiClient.mobileCheckin(checkinData);
            if (response.success) {
              // Reload trip to get updated checkins
              await get().loadActiveTrip();
              return true;
            }
            return false;
          } catch (error) {
            console.error('Failed to perform manual checkin:', error);
            return false;
          }
        },

        // Real-time actions
        connectWebSocket: () => {
          const { user } = get();
          if (!user) return;

          try {
            const socket = apiClient.connectSocket(user.id, user.orgId);
            
            // Set up event handlers
            apiClient.onLocationUpdate((data) => {
              console.log('Location update received:', data);
            });

            apiClient.onTripAssigned((data) => {
              console.log('Trip assigned:', data);
              get().loadActiveTrip();
            });

            apiClient.onGeofenceEvent((data) => {
              console.log('Geofence event:', data);
              get().addGeofenceEvent(data);
            });

            apiClient.onAutoCheckin((data) => {
              console.log('Auto checkin:', data);
              get().loadActiveTrip();
            });

            apiClient.onDocumentSigned((data) => {
              console.log('Document signed:', data);
              get().loadPendingDocuments();
            });

            apiClient.onEmergencyAlert((data) => {
              console.log('Emergency alert:', data);
              get().addNotification({
                id: Date.now().toString(),
                title: 'Emergency Alert',
                message: data.message || 'Emergency alert received',
                type: 'emergency',
                timestamp: new Date().toISOString(),
                read: false,
                urgent: true,
                data,
              });
            });

            apiClient.onInitialState((data) => {
              console.log('Initial state received:', data);
              if (data.trip) get().setActiveTrip(data.trip);
              if (data.notifications) get().setNotifications(data.notifications);
            });

            set({ isSocketConnected: true });
          } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            set({ isSocketConnected: false });
          }
        },

        disconnectWebSocket: () => {
          apiClient.disconnectSocket();
          set({ isSocketConnected: false });
        },

        // Utility actions
        reset: () => set(initialState),

        syncOfflineData: async () => {
          // Implement offline data sync logic here
          const { user } = get();
          if (!user) return;

          try {
            // Sync dashboard data
            await get().loadDashboard();
            await get().loadActiveTrip();
            await get().loadNotifications();
            await get().loadPendingDocuments();
            
            get().updateLastSync();
          } catch (error) {
            console.error('Failed to sync offline data:', error);
          }
        },
      })),
      {
        name: 'mobile-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          currentLocation: state.currentLocation,
          locationPermission: state.locationPermission,
          notifications: state.notifications,
          unreadCount: state.unreadCount,
          stats: state.stats,
          lastSync: state.lastSync,
        }),
      }
    ),
    { name: 'mobile-store' }
  )
);

// Setup online/offline detection
if (typeof window !== 'undefined') {
  const updateOnlineStatus = () => {
    useMobileStore.getState().setOnline(navigator.onLine);
    if (navigator.onLine) {
      // Sync offline data when coming back online
      useMobileStore.getState().syncOfflineData();
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial status
  updateOnlineStatus();
}

export default useMobileStore;

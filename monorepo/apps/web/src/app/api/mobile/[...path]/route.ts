// Mock Phoenix API endpoints for development
import { NextRequest, NextResponse } from 'next/server';

// Mock data that would come from Phoenix backend
const mockData = {
  users: {
    'driver_123': {
      id: 'driver_123',
      name: 'John Smith',
      orgId: 'trucking_co_1',
      role: 'driver',
      phone: '+1234567890',
    }
  },
  trips: {
    'trip-001': {
      id: 'trip-001',
      poNumber: 'PO-2024-001',
      driverName: 'John Smith',
      driverPhone: '+1234567890',
      truckNumber: 'TRK-789',
      trailerNumber: 'TRL-456',
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
      status: 'En Route to Pickup',
      geofences: [
        {
          id: 'geo-001',
          name: 'Pickup Geofence',
          type: 'pickup',
          lat: 33.7490,
          lng: -84.3880,
          radius: 200,
          trip_id: 'trip-001'
        }
      ],
      checkins: [],
      next_checkin_type: 'pickup'
    }
  },
  stats: {
    'driver_123': {
      today_trips: 2,
      completed_trips: 1,
      pending_documents: 3,
      unread_messages: 5
    }
  },
  notifications: {
    'driver_123': [
      {
        id: 'notif-001',
        title: 'Trip Assignment',
        message: 'New trip PO-2024-001 assigned for pickup at 10:00 AM',
        type: 'assignment',
        timestamp: new Date().toISOString(),
        read: false,
        urgent: true,
        data: { trip_id: 'trip-001' }
      },
      {
        id: 'notif-002',
        title: 'Document Ready',
        message: 'BOL for trip PO-2024-001 is ready for signature',
        type: 'document',
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        read: false,
        urgent: false,
        data: { document_id: 'doc-001' }
      },
      {
        id: 'notif-003',
        title: 'Route Update',
        message: 'Traffic detected on I-75. Suggested alternate route available.',
        type: 'navigation',
        timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        read: true,
        urgent: false,
        data: {}
      }
    ]
  }
};

// Helper function to add delay for realistic API response times
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  const { pathname, searchParams } = new URL(request.url);
  await delay(100); // Simulate network latency

  try {
    // Dashboard endpoint
    if (pathname.includes('/dashboard/')) {
      const userId = pathname.split('/dashboard/')[1];
      const orgId = searchParams.get('orgId');
      
      if (!userId || !mockData.users[userId]) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const user = mockData.users[userId];
      const stats = mockData.stats[userId] || {
        today_trips: 0,
        completed_trips: 0,
        pending_documents: 0,
        unread_messages: 0
      };
      const notifications = mockData.notifications[userId] || [];

      return NextResponse.json({
        success: true,
        data: {
          stats,
          notifications: notifications.slice(0, 5), // Recent 5
          location_status: {
            permission_granted: true,
            geofence_monitoring: true,
            last_update: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        }
      });
    }

    // Active trip endpoint
    if (pathname.includes('/trips/active/')) {
      const userId = pathname.split('/trips/active/')[1];
      
      if (!userId || !mockData.users[userId]) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Find active trip for user (in real app, this would query database)
      const activeTrip = Object.values(mockData.trips).find(trip => 
        trip.status.includes('En Route') || trip.status.includes('At Pickup')
      );

      return NextResponse.json({
        success: true,
        data: {
          active_trip: activeTrip || null
        }
      });
    }

    // Notifications endpoint
    if (pathname.includes('/notifications/')) {
      const userId = pathname.split('/notifications/')[1];
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      if (!userId || !mockData.users[userId]) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const notifications = mockData.notifications[userId] || [];
      const paginatedNotifications = notifications.slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        data: {
          notifications: paginatedNotifications,
          has_more: notifications.length > offset + limit
        }
      });
    }

    // Geofences endpoint
    if (pathname.includes('/geofences/')) {
      const userId = pathname.split('/geofences/')[1];
      
      if (!userId || !mockData.users[userId]) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Get geofences for active trip
      const activeTrip = Object.values(mockData.trips).find(trip => 
        trip.status.includes('En Route') || trip.status.includes('At Pickup')
      );

      return NextResponse.json({
        success: true,
        data: {
          geofences: activeTrip?.geofences || []
        }
      });
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('Mock API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url);
  await delay(150); // Simulate network latency for write operations

  try {
    const body = await request.json();

    // Location update endpoint
    if (pathname.includes('/location')) {
      const { user_id, org_id, lat, lon, accuracy, timestamp } = body;
      
      if (!user_id || !mockData.users[user_id]) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Simulate geofence checking (in real app, this would be done by Phoenix backend)
      const events = [];
      const activeTrip = Object.values(mockData.trips).find(trip => 
        trip.status.includes('En Route') || trip.status.includes('At Pickup')
      );

      if (activeTrip) {
        // Check if within pickup geofence
        const pickupGeofence = activeTrip.geofences.find(g => g.type === 'pickup');
        if (pickupGeofence) {
          const distance = calculateDistance(lat, lon, pickupGeofence.lat, pickupGeofence.lng);
          if (distance <= pickupGeofence.radius) {
            events.push({
              id: `event-${Date.now()}`,
              type: 'enter',
              geofence_id: pickupGeofence.id,
              geofence_name: pickupGeofence.name,
              timestamp: new Date().toISOString(),
              distance: Math.round(distance),
              auto_checkin: distance <= 50 // Auto check-in if very close
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          events,
          geofence_events: events.length
        }
      });
    }

    // Check-in endpoint
    if (pathname.includes('/checkins')) {
      const { orgId, tripId, driverId, type, location, method, notes } = body;
      
      if (!driverId || !mockData.users[driverId]) {
        return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
      }

      // Simulate successful check-in
      const checkinId = `checkin-${Date.now()}`;
      const checkin = {
        id: checkinId,
        type,
        timestamp: new Date().toISOString(),
        location,
        method: method || 'manual',
        notes,
        distance: Math.round(Math.random() * 100) // Mock distance
      };

      // Add to trip checkins (in real app, this would update database)
      if (mockData.trips[tripId]) {
        mockData.trips[tripId].checkins.push(checkin);
        
        // Update trip status
        if (type === 'pickup') {
          mockData.trips[tripId].status = 'En Route to Delivery';
          mockData.trips[tripId].next_checkin_type = 'delivery';
        } else if (type === 'delivery') {
          mockData.trips[tripId].status = 'Completed';
          mockData.trips[tripId].next_checkin_type = null;
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          checkin,
          message: `${type} check-in completed successfully`
        }
      });
    }

    // Mark notifications as read
    if (pathname.includes('/notifications/read')) {
      const { notification_ids, userId } = body;
      
      if (!userId || !mockData.users[userId]) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Mark notifications as read
      if (mockData.notifications[userId]) {
        mockData.notifications[userId] = mockData.notifications[userId].map(notification => 
          notification_ids.includes(notification.id) 
            ? { ...notification, read: true }
            : notification
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          marked_read: notification_ids.length,
          message: `${notification_ids.length} notifications marked as read`
        }
      });
    }

    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });

  } catch (error) {
    console.error('Mock API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

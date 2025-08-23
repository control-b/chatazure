// Detect local development so we don't aggressively cache or show offline during dev
const host = self.location?.hostname || '';
const search = (self.location && (self.location.search || '')) || '';
const isPrivateLan = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host);
const isLocalHost = /^localhost$|^127\.0\.0\.1$|^0\.0\.0\.0$/.test(host) || host.endsWith('.local');
const hasDevQuery = /[?&]dev=1(&|$)/.test(search);
const IS_DEV = Boolean(isLocalHost || isPrivateLan || hasDevQuery);

const CACHE_NAME = 'logichat-v1.0.0';
const STATIC_CACHE_NAME = 'logichat-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'logichat-dynamic-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/chat',
  '/trips',
  '/documents',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// API endpoints to cache dynamically
const API_CACHE_PATTERNS = [
  /^\/api\/trips/,
  /^\/api\/documents/,
  /^\/api\/user/,
  /^\/api\/notifications/,
];

// Assets that should always be fetched fresh
const NEVER_CACHE_PATTERNS = [
  /^\/api\/auth/,
  /^\/api\/upload/,
  /^\/api\/location/,
  /^\/api\/geofence/,
];

// Maximum age for cached items (24 hours)
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  // In dev, skip pre-caching to avoid navigation caching issues with Next.js dev server
  if (IS_DEV) {
  event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil((async () => {
    try {
      // Enable navigation preload for faster responses where supported
      if ('navigationPreload' in self.registration) {
        try {
          await self.registration.navigationPreload.enable();
          console.log('[SW] Navigation preload enabled');
        } catch (e) {
          console.warn('[SW] Navigation preload enable failed:', e);
        }
      }

      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== DYNAMIC_CACHE_NAME &&
            cacheName !== CACHE_NAME
          ) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      console.log('[SW] Old caches cleaned up');
      await self.clients.claim();
      console.log('[SW] Clients claimed');
    } catch (error) {
      console.error('[SW] Failed during activate:', error);
    }
  })());
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;
  // Skip non-http(S) requests
  if (!url.protocol.startsWith('http')) return;

  // In dev, always go to network to avoid stale/offline issues while iterating
  if (IS_DEV) {
    // Prefer navigation preload response if available
    event.respondWith((async () => {
      try {
        const preload = 'preloadResponse' in event ? await event.preloadResponse : null;
        if (preload) return preload;
      } catch (_) {}
      return fetch(request);
    })());
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/_next/static/')) {
    // Next.js static assets - cache first
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/api/')) {
    // API requests
    event.respondWith(handleAPIRequest(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    // Static assets - cache first
    event.respondWith(cacheFirst(request));
  } else {
    // Navigation requests - network first with offline fallback
    event.respondWith(networkFirstWithOfflineFallback(request));
  }
});

// Cache first strategy - for static assets
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return new Response('Network error', { status: 503 });
  }
}

// Listen for messages from the client to immediately activate a waiting SW
self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { type } = event.data || {};
  if (type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING message received');
    self.skipWaiting();
  }
});

// Network first with offline fallback - for navigation
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Handle API requests with smart caching
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // Never cache certain endpoints
  const shouldNeverCache = NEVER_CACHE_PATTERNS.some(pattern => 
    pattern.test(url.pathname)
  );
  
  if (shouldNeverCache) {
    try {
      return await fetch(request);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Network unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  
  // Use cache for certain API endpoints
  const shouldCache = API_CACHE_PATTERNS.some(pattern => 
    pattern.test(url.pathname)
  );
  
  if (shouldCache) {
    try {
      // Try network first
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        const responseToCache = networkResponse.clone();
        
        // Add timestamp to cached response
        const headers = new Headers(responseToCache.headers);
        headers.set('sw-cache-timestamp', Date.now().toString());
        
        const modifiedResponse = new Response(responseToCache.body, {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: headers,
        });
        
        cache.put(request, modifiedResponse);
      }
      
      return networkResponse;
    } catch (error) {
      // Network failed, try cache
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        // Check if cached response is still fresh
        const timestamp = cachedResponse.headers.get('sw-cache-timestamp');
        if (timestamp && (Date.now() - parseInt(timestamp)) < CACHE_MAX_AGE) {
          // Add header to indicate this is from cache
          const headers = new Headers(cachedResponse.headers);
          headers.set('sw-from-cache', 'true');
          
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers: headers,
          });
        }
      }
      
      return new Response(JSON.stringify({ error: 'Data unavailable offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
  
  // Default: just try to fetch
  try {
    return await fetch(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Network unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Background sync for when connectivity is restored
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'geofence-checkin') {
    event.waitUntil(syncGeofenceCheckins());
  } else if (event.tag === 'document-signature') {
    event.waitUntil(syncDocumentSignatures());
  } else if (event.tag === 'offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync pending geofence check-ins
async function syncGeofenceCheckins() {
  try {
    // Get pending check-ins from IndexedDB
    const pendingCheckins = await getPendingCheckins();
    
    for (const checkin of pendingCheckins) {
      try {
        const response = await fetch('/api/trips/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(checkin.data),
        });
        
        if (response.ok) {
          await removePendingCheckin(checkin.id);
          console.log('[SW] Synced check-in:', checkin.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync check-in:', checkin.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync pending document signatures
async function syncDocumentSignatures() {
  try {
    const pendingSignatures = await getPendingSignatures();
    
    for (const signature of pendingSignatures) {
      try {
        const response = await fetch('/api/documents/sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(signature.data),
        });
        
        if (response.ok) {
          await removePendingSignature(signature.id);
          console.log('[SW] Synced signature:', signature.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync signature:', signature.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync signatures:', error);
  }
}

// Sync other offline data
async function syncOfflineData() {
  try {
    // Implement other offline data sync logic here
    console.log('[SW] Syncing offline data...');
  } catch (error) {
    console.error('[SW] Failed to sync offline data:', error);
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
      notificationData = { title: 'LogiChat', body: event.data.text() };
    }
  }
  
  const options = {
    title: notificationData.title || 'LogiChat',
    body: notificationData.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: notificationData.tag || 'default',
    data: notificationData.data || {},
    actions: notificationData.actions || [],
    silent: false,
    renotify: true,
  };
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const action = event.action;
  
  let url = '/';
  
  if (action === 'view_trip' || notificationData.type === 'trip') {
    url = `/trips/${notificationData.tripId || ''}`;
  } else if (action === 'view_document' || notificationData.type === 'document') {
    url = `/documents/${notificationData.documentId || ''}`;
  } else if (action === 'view_chat' || notificationData.type === 'chat') {
    url = `/chat/${notificationData.channelId || ''}`;
  } else if (notificationData.url) {
    url = notificationData.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Helper functions for IndexedDB operations
async function getPendingCheckins() {
  // Implement IndexedDB operations for pending check-ins
  return [];
}

async function removePendingCheckin(id) {
  // Implement IndexedDB removal for check-in
}

async function getPendingSignatures() {
  // Implement IndexedDB operations for pending signatures
  return [];
}

async function removePendingSignature(id) {
  // Implement IndexedDB removal for signature
}

// Handle periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync event:', event.tag);
  
  if (event.tag === 'location-update') {
    event.waitUntil(updateLocationInBackground());
  }
});

async function updateLocationInBackground() {
  // Implement background location update logic
  console.log('[SW] Updating location in background...');
}

"use client";

// PWA utilities for service worker registration and management

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWACapabilities {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  supportsServiceWorker: boolean;
  supportsNotifications: boolean;
  supportsBackgroundSync: boolean;
  supportsPeriodicBackgroundSync: boolean;
}

let deferredPrompt: PWAInstallPrompt | null = null;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

// Simple environment detection
const isDevEnv =
  typeof window !== 'undefined' &&
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.endsWith('.local'));

// Idempotency guards to avoid double registration in React StrictMode dev
function hasRegisteredSWThisSession(): boolean {
  try {
    return Boolean((window as any).__swRegistered);
  } catch {
    return false;
  }
}
function markSWRegistered() {
  try {
    (window as any).__swRegistered = true;
  } catch {}
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Workers not supported');
    return null;
  }

  try {
    // In development, skip registering the SW to avoid reload/blinking due to HMR + StrictMode
    if (isDevEnv) {
      console.info('[PWA] Skipping Service Worker registration in development');
      return null;
    }

    // Prevent duplicate registrations within the same session
    if (hasRegisteredSWThisSession()) {
      return serviceWorkerRegistration;
    }

    const swUrl = '/sw.js';

    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
      updateViaCache: 'none',
    });

    serviceWorkerRegistration = registration;
    markSWRegistered();

    console.log('[PWA] Service Worker registered successfully');

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available
              showUpdateAvailableNotification();
              // Do NOT auto-activate here; let the UI call applyPendingUpdate()
            } else {
              // Content is cached for offline use
              console.log('[PWA] Content cached for offline use');
            }
          }
        });
      }
    });

    // If there's already a waiting worker, notify UI; do not force activation
    if (registration.waiting) {
      showUpdateAvailableNotification();
    }

    // Avoid auto-reload on controllerchange; UI triggers reload via applyPendingUpdate()

    return registration;
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
    return null;
  }
}

// Development utility: unregister all service workers and clear caches
export async function devForceUnregisterAllServiceWorkers(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          try {
            await reg.unregister();
          } catch (e) {
            console.warn('[PWA] Failed to unregister SW during dev cleanup:', e);
          }
        })
      );
    }
  } catch (e) {
    console.warn('[PWA] Dev cleanup SW registry failed:', e);
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn('[PWA] Dev cleanup caches failed:', e);
  }
}

// Unregister service worker
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!serviceWorkerRegistration) {
    return false;
  }

  try {
    const result = await serviceWorkerRegistration.unregister();
    if (result) {
      console.log('[PWA] Service Worker unregistered successfully');
    }
    return result;
  } catch (error) {
    console.error('[PWA] Service Worker unregistration failed:', error);
    return false;
  }
}

// Check PWA capabilities
export function getPWACapabilities(): PWACapabilities {
  if (typeof window === 'undefined') {
    return {
      isInstallable: false,
      isInstalled: false,
      isStandalone: false,
      supportsServiceWorker: false,
      supportsNotifications: false,
      supportsBackgroundSync: false,
      supportsPeriodicBackgroundSync: false,
    };
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true ||
                      document.referrer.includes('android-app://');

  return {
    isInstallable: deferredPrompt !== null,
    isInstalled: isStandalone,
    isStandalone,
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsNotifications: 'Notification' in window,
    supportsBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
    supportsPeriodicBackgroundSync: 'serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype,
  };
}

// Setup install prompt listener
export function setupInstallPrompt(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    
    // Stash the event so it can be triggered later
  // Cast to unknown first since BeforeInstallPromptEvent isn't in standard lib dom types
  deferredPrompt = (e as unknown) as PWAInstallPrompt;
    
    console.log('[PWA] Install prompt available');
    
    // Notify the app that PWA can be installed
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] PWA was installed');
    deferredPrompt = null;
    
    // Notify the app that PWA was installed
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

// Show install prompt
export async function showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    console.warn('[PWA] Install prompt not available');
    return 'unavailable';
  }

  try {
    // Show the install prompt
    await deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`[PWA] User ${outcome} the install prompt`);
    
    // Clear the deferredPrompt
    deferredPrompt = null;
    
    return outcome;
  } catch (error) {
    console.error('[PWA] Install prompt failed:', error);
    return 'unavailable';
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    console.log(`[PWA] Notification permission: ${permission}`);
    return permission;
  }

  return Notification.permission;
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!serviceWorkerRegistration) {
    console.warn('[PWA] Service Worker not registered');
    return null;
  }

  if (!('PushManager' in window)) {
    console.warn('[PWA] Push notifications not supported');
    return null;
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('[PWA] Notification permission not granted');
      return null;
    }

    // Check if already subscribed
    const existingSubscription = await serviceWorkerRegistration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('[PWA] Already subscribed to push notifications');
      return existingSubscription;
    }

    // Subscribe to push notifications
    const subscription = await serviceWorkerRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast to BufferSource to satisfy TS lib dom variations
      applicationServerKey: (urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '') as unknown) as BufferSource,
    });

    console.log('[PWA] Subscribed to push notifications');
    return subscription;
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error);
    return null;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!serviceWorkerRegistration) {
    return false;
  }

  try {
    const subscription = await serviceWorkerRegistration.pushManager.getSubscription();
    if (subscription) {
      const result = await subscription.unsubscribe();
      console.log('[PWA] Unsubscribed from push notifications');
      return result;
    }
    return true;
  } catch (error) {
    console.error('[PWA] Push unsubscription failed:', error);
    return false;
  }
}

// Register background sync
export async function registerBackgroundSync(tag: string): Promise<void> {
  if (!serviceWorkerRegistration) {
    console.warn('[PWA] Service Worker not registered');
    return;
  }

  if (!('sync' in window.ServiceWorkerRegistration.prototype)) {
    console.warn('[PWA] Background Sync not supported');
    return;
  }

  try {
    await (serviceWorkerRegistration as any).sync.register(tag);
    console.log(`[PWA] Background sync registered: ${tag}`);
  } catch (error) {
    console.error(`[PWA] Background sync registration failed: ${tag}`, error);
  }
}

// Register periodic background sync
export async function registerPeriodicBackgroundSync(tag: string, minInterval: number): Promise<void> {
  if (!serviceWorkerRegistration) {
    console.warn('[PWA] Service Worker not registered');
    return;
  }

  if (!('periodicSync' in window.ServiceWorkerRegistration.prototype)) {
    console.warn('[PWA] Periodic Background Sync not supported');
    return;
  }

  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
    if (status.state === 'granted') {
      await (serviceWorkerRegistration as any).periodicSync.register(tag, {
        minInterval,
      });
      console.log(`[PWA] Periodic background sync registered: ${tag}`);
    } else {
      console.warn('[PWA] Periodic background sync permission not granted');
    }
  } catch (error) {
    console.error(`[PWA] Periodic background sync registration failed: ${tag}`, error);
  }
}

// Show update available notification
function showUpdateAvailableNotification(): void {
  // Create a custom event that the app can listen to
  window.dispatchEvent(new CustomEvent('pwa-update-available'));
  
  // Also show a browser notification if permission is granted
  if (Notification.permission === 'granted') {
    new Notification('Update Available', {
      body: 'A new version of LogiChat is available. Refresh to update.',
      icon: '/icons/icon-192x192.png',
      tag: 'update-available',
    });
  }
}

// Apply pending update
export async function applyPendingUpdate(): Promise<void> {
  if (!serviceWorkerRegistration) {
    return;
  }

  const waitingWorker = serviceWorkerRegistration.waiting;
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload the page to activate the new service worker
    window.location.reload();
  }
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Check if device is mobile
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (!!navigator.maxTouchPoints && navigator.maxTouchPoints > 1)
  );
}

// Check if device is iOS
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// Get device type
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/mobile|android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return 'mobile';
  }
  
  if (/ipad|tablet|kindle|silk|playbook/i.test(userAgent) || 
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.screen.width >= 768)) {
    return 'tablet';
  }
  
  return 'desktop';
}

// Initialize PWA
export async function initializePWA(): Promise<void> {
  console.log('[PWA] Initializing...');
  
  // Setup install prompt listener
  setupInstallPrompt();
  
  // Register service worker
  await registerServiceWorker();
  
  // Set up online/offline detection
  window.addEventListener('online', () => {
    console.log('[PWA] Online');
    window.dispatchEvent(new CustomEvent('pwa-online'));
  });
  
  window.addEventListener('offline', () => {
    console.log('[PWA] Offline');
    window.dispatchEvent(new CustomEvent('pwa-offline'));
  });
  
  // Request notification permission on mobile devices
  if (isMobileDevice()) {
    // Don't request immediately, wait for user interaction
    setTimeout(() => {
      if (Notification.permission === 'default') {
        console.log('[PWA] Ready to request notification permission');
      }
    }, 5000);
  }
  
  console.log('[PWA] Initialization complete');
}

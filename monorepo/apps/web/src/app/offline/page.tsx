"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  WifiOff,
  RefreshCw,
  Phone,
  MapPin,
  AlertTriangle,
  Truck,
  FileText,
  Clock,
} from "lucide-react";

interface OfflinePageProps {
  className?: string;
}

export function OfflinePage({ className }: OfflinePageProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState(0);

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get last sync time from localStorage
  useEffect(() => {
    const lastSync = localStorage.getItem('lastSyncTime');
    if (lastSync) {
      setLastSyncTime(lastSync);
    }

    // Get pending actions count
    const pending = localStorage.getItem('pendingActions');
    if (pending) {
      setPendingActions(parseInt(pending) || 0);
    }
  }, []);

  const handleRetry = () => {
    if (isOnline) {
      window.location.reload();
    }
  };

  const handleEmergencyCall = () => {
    window.open('tel:+1234567890', '_self');
  };

  const formatLastSync = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className={cn("min-h-screen bg-slate-50 flex flex-col", className)}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <WifiOff className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              You're Offline
            </h1>
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2 w-2 rounded-full",
                isOnline ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm text-slate-600">
                {isOnline ? 'Connection restored' : 'No internet connection'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-6">
        {/* Connection Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center">
          <div className="mb-4">
            <WifiOff className="h-16 w-16 text-slate-400 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            No Internet Connection
          </h2>
          <p className="text-slate-600 mb-6">
            Some features may not be available while offline. We'll sync your data when connection is restored.
          </p>
          
          <Button
            onClick={handleRetry}
            disabled={!isOnline}
            className="w-full mb-3"
          >
            <RefreshCw className={cn(
              "h-4 w-4 mr-2",
              !isOnline && "animate-spin"
            )} />
            {isOnline ? 'Reload Page' : 'Checking Connection...'}
          </Button>
          
          {lastSyncTime && (
            <p className="text-sm text-slate-500">
              Last synced: {formatLastSync(lastSyncTime)}
            </p>
          )}
        </div>

        {/* Pending Actions */}
        {pendingActions > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-900 mb-1">
                  Pending Sync
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  You have {pendingActions} action{pendingActions > 1 ? 's' : ''} waiting to sync when you're back online.
                </p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Check-ins will be automatically synced</li>
                  <li>• Document signatures will be uploaded</li>
                  <li>• Messages will be sent</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Available Offline Features */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Available Offline</h3>
            <p className="text-sm text-slate-600 mt-1">
              These features work without internet connection
            </p>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <MapPin className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Location Services</div>
                <div className="text-sm text-green-700">GPS tracking continues to work</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Truck className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Trip Check-ins</div>
                <div className="text-sm text-green-700">Can check in, will sync later</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Document Viewing</div>
                <div className="text-sm text-green-700">View cached documents</div>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Actions */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">Emergency Actions</h3>
            <p className="text-sm text-slate-600 mt-1">
              Available even without internet
            </p>
          </div>
          
          <div className="p-4 space-y-3">
            <Button
              onClick={handleEmergencyCall}
              variant="outline"
              className="w-full justify-start border-red-200 hover:bg-red-50"
            >
              <Phone className="h-4 w-4 mr-3 text-red-600" />
              <div className="text-left">
                <div className="font-medium text-red-900">Emergency Line</div>
                <div className="text-sm text-red-700">Call dispatch or emergency services</div>
              </div>
            </Button>
            
            <Button
              onClick={() => window.open('tel:911', '_self')}
              variant="outline"
              className="w-full justify-start border-red-200 hover:bg-red-50"
            >
              <AlertTriangle className="h-4 w-4 mr-3 text-red-600" />
              <div className="text-left">
                <div className="font-medium text-red-900">911 Emergency</div>
                <div className="text-sm text-red-700">For life-threatening situations</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Offline Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your location is still being tracked for check-ins</li>
            <li>• Any actions you take will sync when connection returns</li>
            <li>• Emergency calling works without internet</li>
            <li>• Move to an area with better signal if possible</li>
          </ul>
        </div>
      </div>

      {/* Auto-retry indicator */}
      {!isOnline && (
        <div className="bg-slate-800 text-white px-4 py-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Checking for connection...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Default export for Next.js page
export default function OfflinePageRoute() {
  return <OfflinePage />;
}

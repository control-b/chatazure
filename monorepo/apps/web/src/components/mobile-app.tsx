'use client';

import { useEffect, useState } from 'react';
import { useMobileStore } from '@/lib/mobile-store';
import DashboardMobile from '@/components/mobile/dashboard-mobile';
import { CheckInMobile } from '@/lib/mobile-checkin';
import DocumentViewerMobile from '@/components/mobile/document-viewer-mobile';
import TripCreationMobile from '@/components/mobile/trip-creation-mobile';
import { MobileNavigation } from '@/components/mobile/navigation-mobile';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Wifi, 
  WifiOff,
  AlertTriangle 
} from 'lucide-react';

type MobileView = 'dashboard' | 'checkin' | 'documents' | 'trips' | 'profile';

interface MobileAppProps {
  className?: string;
}

export function MobileApp({ className }: MobileAppProps) {
  const {
    user,
    isAuthenticated,
    isOnline,
    isSocketConnected,
    setUser,
    setAuthenticated,
    connectWebSocket,
    loadDashboard,
    startLocationTracking,
  } = useMobileStore();

  const [currentView, setCurrentView] = useState<MobileView>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);

  // Mock authentication for demo
  useEffect(() => {
    const initializeApp = async () => {
      setIsInitializing(true);
      
      // Mock user authentication
      const mockUser = {
        id: 'user-123',
        name: 'John Driver',
        orgId: 'org-456',
        role: 'driver' as const,
        phone: '+1-555-0123',
        avatar: undefined,
      };
      
      setUser(mockUser);
      setAuthenticated(true);
      
      // Initialize mobile features
      await startLocationTracking();
      connectWebSocket();
      await loadDashboard();
      
      setIsInitializing(false);
    };

    initializeApp();
  }, []);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Loader2 className="h-12 w-12 mx-auto text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Starting Mobile App</h2>
          <p className="text-muted-foreground">
            Initializing location services and connecting...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg">
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to access the mobile trucking platform
            </p>
            <Button
              onClick={() => {
                // Mock sign in
                setAuthenticated(true);
              }}
              className="w-full"
            >
              Demo Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardMobile />;
      case 'checkin':
        return <CheckInMobile />;
      case 'documents':
        return <DocumentViewerMobile />;
      case 'trips':
        return <TripCreationMobile />;
      default:
        return <DashboardMobile />;
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 ${className}`}>
      {/* Connection Status Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {isSocketConnected && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Live
              </span>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            {user.name} • {user.role}
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              You're offline. Some features may be limited.
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="pb-16">
        {renderCurrentView()}
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation
        user={user}
        onSignOut={() => {
          setUser(null);
          setAuthenticated(false);
        }}
      />
    </div>
  );
}

export default MobileApp;

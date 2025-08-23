"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Truck,
  FileText,
  User,
  Menu,
  X,
  Bell,
  MapPin,
  Phone,
  Settings,
  LogOut,
  Home,
} from "lucide-react";
import { useMobileGeofence } from "@/lib/mobile-geofence";

interface MobileNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  isActive?: boolean;
}

interface MobileNavigationProps {
  user?: {
    id: string;
    name: string;
    role: 'driver' | 'dispatcher' | 'admin';
    avatar?: string;
  };
  onSignOut?: () => void;
  className?: string;
}

export function MobileNavigation({ user, onSignOut, className }: MobileNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showSidebar, setShowSidebar] = useState(false);
  const [notifications, setNotifications] = useState(0);
  
  const { status: geofenceStatus, permissionStatus } = useMobileGeofence();

  // Navigation items based on user role
  const getNavItems = (): MobileNavItem[] => {
    const baseItems: MobileNavItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        href: '/dashboard',
        isActive: pathname === '/dashboard',
      },
      {
        id: 'chat',
        label: 'Chat',
        icon: MessageSquare,
        href: '/chat',
        badge: notifications,
        isActive: pathname.startsWith('/chat'),
      },
    ];

    if (user?.role === 'driver') {
      return [
        ...baseItems,
        {
          id: 'trips',
          label: 'My Trips',
          icon: Truck,
          href: '/trips',
          isActive: pathname.startsWith('/trips'),
        },
        {
          id: 'documents',
          label: 'Documents',
          icon: FileText,
          href: '/documents',
          isActive: pathname.startsWith('/documents'),
        },
      ];
    }

    if (user?.role === 'dispatcher') {
      return [
        ...baseItems,
        {
          id: 'fleet',
          label: 'Fleet',
          icon: Truck,
          href: '/fleet',
          isActive: pathname.startsWith('/fleet'),
        },
        {
          id: 'documents',
          label: 'Documents',
          icon: FileText,
          href: '/documents',
          isActive: pathname.startsWith('/documents'),
        },
      ];
    }

    // Admin or default
    return [
      ...baseItems,
      {
        id: 'fleet',
        label: 'Fleet',
        icon: Truck,
        href: '/fleet',
        isActive: pathname.startsWith('/fleet'),
      },
      {
        id: 'documents',
        label: 'Documents',
        icon: FileText,
        href: '/documents',
        isActive: pathname.startsWith('/documents'),
      },
      {
        id: 'users',
        label: 'Users',
        icon: User,
        href: '/users',
        isActive: pathname.startsWith('/users'),
      },
    ];
  };

  const navItems = getNavItems();

  // Handle navigation
  const handleNavigation = (href: string) => {
    router.push(href);
    setShowSidebar(false);
  };

  // Mock notification count (replace with real data)
  useEffect(() => {
    const interval = setInterval(() => {
      // In real app, this would come from WebSocket or API
      setNotifications(Math.floor(Math.random() * 5));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setShowSidebar(false);
  }, [pathname]);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40",
        "safe-area-pb", // For devices with home indicator
        className
      )}>
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center px-2 py-2 rounded-lg relative",
                  "min-w-0 flex-1 transition-colors",
                  item.isActive
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium truncate">
                  {item.label}
                </span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
          
          {/* More/Menu Button */}
          <button
            onClick={() => setShowSidebar(true)}
            className="flex flex-col items-center justify-center px-2 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors min-w-0 flex-1"
          >
            <Menu className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-slate-600" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-slate-900">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-sm text-slate-600 capitalize">
                    {user?.role || 'user'}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Status Info */}
            <div className="p-4 border-b border-slate-200">
              <div className="space-y-2">
                {/* Location Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-600" />
                    <span className="text-sm text-slate-900">Location</span>
                  </div>
                  <div className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    permissionStatus === 'granted'
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  )}>
                    {permissionStatus === 'granted' ? 'Active' : 'Disabled'}
                  </div>
                </div>

                {/* Geofence Monitoring */}
                {user?.role === 'driver' && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-slate-600" />
                      <span className="text-sm text-slate-900">Auto Check-in</span>
                    </div>
                    <div className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      geofenceStatus.isWatching
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-800"
                    )}>
                      {geofenceStatus.isWatching ? 'On' : 'Off'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-2">
                {/* All Navigation Items */}
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigation(item.href)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors",
                        item.isActive
                          ? "bg-blue-50 text-blue-900"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}

                <hr className="my-4" />

                {/* Emergency/Quick Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      window.open('tel:+1234567890', '_self');
                      setShowSidebar(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Phone className="h-5 w-5" />
                    <span className="font-medium">Emergency Line</span>
                  </button>

                  <button
                    onClick={() => handleNavigation('/settings')}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors",
                      pathname === '/settings'
                        ? "bg-blue-50 text-blue-900"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="font-medium">Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200">
              <Button
                variant="ghost"
                onClick={() => {
                  onSignOut?.();
                  setShowSidebar(false);
                }}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add bottom padding to prevent content overlap */}
      <style jsx global>{`
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
}

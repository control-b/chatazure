"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/app/sidebar";
import { ChatWindow } from "@/components/app/chat-window";
import { PresencePanel } from "@/components/app/presence-panel";
import { DocumentEditor } from "@/components/app/document-editor";
import { SignatureModal } from "@/components/app/signature-modal";
import { GeofencingPanel } from "@/components/app/geofencing-panel";
import { usePhoenix } from "@/lib/phoenix/context";
import { GeoEventFeed } from "@/components/app/geo-event-feed";
import { Bell, Pin, Users, Truck } from "lucide-react";
import type { Room, User } from "@/types";

function AppPageImpl() {
  const { data: session, status } = useSession();
  const { socket, isConnected } = usePhoenix();
  const router = useRouter();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [rightPanelView, setRightPanelView] = useState<
    "presence" | "geofencing"
  >("presence");
  const [documentEditorOpen, setDocumentEditorOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [geoEvents, setGeoEvents] = useState<any[]>([]);
  const [selectedGeofenceId, setSelectedGeofenceId] = useState<string | undefined>(undefined);
  const [currentDocument, setCurrentDocument] = useState<any>(null);
  const [currentSignature, setCurrentSignature] = useState<any>(null);
  const search = useSearchParams();
  // SSR-safe mount flag to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  // Derive demo flag on client only to avoid server/client mismatch
  const demoMode = useMemo(() => {
    if (!mounted) return false;
    let flag = false;
    try {
      flag = search.get("demo") === "1";
    } catch {
      flag =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("demo") === "1";
    }
    // Default to demo when not authenticated or still loading (dev-only convenience)
    if (!flag && status !== "authenticated") return true;
    return flag;
  }, [mounted, search, status]);

  // Optional debug overlay toggled via ?debug=1
  const debugMode = useMemo(() => {
    if (!mounted) return false;
    try {
      return search.get("debug") === "1";
    } catch {
      return (
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("debug") === "1"
      );
    }
  }, [mounted, search]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Do not auto-redirect; render a CTA for unauthenticated users instead to avoid blank navigation states

  useEffect(() => {
    if (demoMode) {
      const demoRooms: Room[] = [
        {
          id: "general",
          name: "general",
          type: "public",
          orgId: "demo",
        } as any,
        { id: "ops", name: "operations", type: "public", orgId: "demo" } as any,
        {
          id: "dispatch",
          name: "dispatch",
          type: "private",
          orgId: "demo",
        } as any,
      ];
      setRooms(demoRooms);
      setSelectedRoom(demoRooms[0]);
      setOnlineUsers([
        {
          id: "u1",
          name: "Alex Owner",
          role: "owner",
          status: "active",
        } as any,
        {
          id: "u2",
          name: "Dana Dispatcher",
          role: "dispatcher",
          status: "active",
        } as any,
        {
          id: "u3",
          name: "Chris Driver",
          role: "driver",
          status: "inactive",
        } as any,
      ]);

      // Demo geofences
      setGeofences([
        {
          id: "geo1",
          name: "Warehouse A",
          type: "pickup",
          status: "active",
          address: "123 Main St, City, State",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          triggerCount: 15,
          lastTriggered: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "geo2",
          name: "Customer Site B",
          type: "delivery",
          status: "active",
          address: "456 Oak Ave, City, State",
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          triggerCount: 8,
          lastTriggered: new Date(Date.now() - 7200000).toISOString(),
        },
      ]);

      // Demo geo events
      setGeoEvents([
        {
          id: "event1",
          type: "enter",
          driverName: "Chris Driver",
          geofenceName: "Warehouse A",
          vehicleId: "TRUCK-001",
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          location: [40.7128, -74.006],
        },
        {
          id: "event2",
          type: "exit",
          driverName: "Chris Driver",
          geofenceName: "Customer Site B",
          vehicleId: "TRUCK-001",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          location: [40.7589, -73.9851],
        },
      ]);
      return;
    }
    if (session?.user && isConnected && socket) {
      // Fetch user's rooms
      fetchRooms();
    }
  }, [session, isConnected, socket, demoMode]);

  const fetchRooms = async () => {
    try {
      const orgId = (session as any).user?.orgId as string;
      const accessToken = (session as any).accessToken as string;
      const response = await fetch(`/api/phoenix/orgs/${orgId}/rooms`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const roomsData = await response.json();
        setRooms(roomsData);
        if (roomsData.length > 0 && !selectedRoom) {
          setSelectedRoom(roomsData[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  };

  // Handler functions for dashboard components
  const handleCreateChannel = async (
    name: string,
    type: "public" | "private"
  ) => {
    try {
      const orgId = (session as any).user?.orgId as string;
      const accessToken = (session as any).accessToken as string;
      const response = await fetch(`/api/phoenix/orgs/${orgId}/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, type }),
      });
      if (response.ok) {
        await fetchRooms(); // Refresh rooms list
      }
    } catch (error) {
      console.error("Failed to create channel:", error);
    }
  };

  const handleDocumentView = (documentId: string) => {
    // Mock document for demo
    const mockDocument = {
      documentId,
      title: `Document ${documentId}`,
      content: "Start writing your document...",
      isEditable: true,
      collaborators: [
        { id: "u1", name: "Alex", color: "#60a5fa" },
        { id: "u2", name: "Dana", color: "#34d399" },
      ],
    } as any;
    setCurrentDocument(mockDocument);
    setDocumentEditorOpen(true);
  };

  // Activity and DM stubs
  const handleActivityView = () => {
    console.log("Activity view clicked");
  };
  const handleDirectMessage = (userId: string) => {
    console.log("Start DM with", userId);
  };

  // Presence panel stubs
  const handleUserSelect = (userId: string) => {
    console.log("User selected", userId);
  };
  const handleInviteUser = () => {
    console.log("Invite user clicked");
  };

  // Geofencing stubs
  const handleGeofenceSelect = (geofenceId: string) => {
    setSelectedGeofenceId(geofenceId);
  };
  const handleGeofenceCreate = () => {
    console.log("Create geofence");
  };
  const handleGeofenceEdit = (geofenceId: string) => {
    console.log("Edit geofence", geofenceId);
  };
  const handleGeofenceDelete = (geofenceId: string) => {
    console.log("Delete geofence", geofenceId);
  };
  const handleGeofenceToggle = (geofenceId: string) => {
    console.log("Toggle geofence", geofenceId);
  };

  // Document editor handlers
  const handleDocumentContentChange = (content: string) => {
    setCurrentDocument((d: any) => ({ ...d, content }));
  };
  const handleDocumentTitleChange = (title: string) => {
    setCurrentDocument((d: any) => ({ ...d, title }));
  };
  const handleDocumentSave = async () => {
    console.log("Saving document", currentDocument);
  };
  const handleDocumentShare = () => {
    console.log("Share document");
  };
  const handleDocumentDownload = () => {
    console.log("Download document");
  };
  const handleDocumentClose = () => {
    setDocumentEditorOpen(false);
    setCurrentDocument(null);
  };

  // Signature modal handlers
  const handleSignatureRequest = (docId: string) => {
    setCurrentSignature({
      documentTitle: `Document ${docId}`,
      signerName: (session as any)?.user?.name || "",
      signerEmail: (session as any)?.user?.email || "",
    });
    setSignatureModalOpen(true);
  };
  const handleSignatureCancel = () => {
    setSignatureModalOpen(false);
    setCurrentSignature(null);
  };
  const handleSignatureSubmit = (signatureData: string, signerInfo: any) => {
    console.log("Signature captured", { signatureData, signerInfo });
    setSignatureModalOpen(false);
    setCurrentSignature(null);
  };

  return (
    <div className="h-screen flex bg-slate-950">
      {debugMode && (
        <div className="fixed top-2 left-2 z-50 text-xs bg-slate-800/90 border border-slate-700 text-slate-200 rounded p-2 space-y-1">
          <div>mounted: {String(mounted)}</div>
          <div>status: {status}</div>
          <div>demoMode: {String(demoMode)}</div>
          <div>rooms: {rooms.length}</div>
          <div>selectedRoom: {selectedRoom ? selectedRoom.id : "none"}</div>
          <div>rightDrawerOpen: {String(rightDrawerOpen)}</div>
        </div>
      )}
      {/* Left Sidebar - Rooms List */}
      <div
        className={`${sidebarCollapsed ? "w-16" : "w-64"} bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-300 ease-in-out`}
      >
        <div className="h-16 border-b border-slate-700 flex items-center px-4 gap-2">
          {!sidebarCollapsed && (
            <h1 className="text-xl font-bold text-blue-400">ChatDO</h1>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${sidebarCollapsed ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
        <Sidebar
          rooms={rooms}
          selectedRoom={selectedRoom}
          onRoomSelectAction={setSelectedRoom}
          onCreateChannelAction={handleCreateChannel}
          onDocumentViewAction={handleDocumentView}
          onActivityViewAction={handleActivityView}
          onDirectMessageAction={handleDirectMessage}
          collapsed={sidebarCollapsed}
          user={
            (session as any)?.user ||
            (demoMode
              ? ({
                  id: "u1",
                  name: "Demo User",
                  role: "owner",
                  status: "active",
                } as any)
              : undefined)
          }
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {selectedRoom ? (
          <>
            {/* Top Toolbar + Channel Header */}
            <div className="bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-slate-900/70 border-b border-slate-800">
              <div className="h-12 px-4 flex items-center justify-end gap-2">
                <button
                  className="p-2 hover:bg-slate-800 rounded text-slate-300"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
                <button
                  className="p-2 hover:bg-slate-800 rounded text-slate-300"
                  title="Pin"
                >
                  <Pin className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setRightPanelView("presence");
                    setRightDrawerOpen(true);
                  }}
                  className={`p-2 rounded transition-colors border ${rightDrawerOpen && rightPanelView === "presence" ? "bg-slate-800 text-blue-400 border-blue-400" : "text-slate-300 border-transparent hover:bg-slate-800"}`}
                  title="Team Members"
                >
                  <Users className="h-4 w-4" />
                </button>
                <div className="h-5 w-px bg-slate-700/80 mx-1" />
                <div className="relative ml-2">
                  <input
                    type="text"
                    placeholder="Search"
                    className="bg-slate-800/80 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-sm text-slate-200 placeholder-slate-500 w-72"
                  />
                  <svg
                    className="w-4 h-4 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="px-4 pb-3">
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-400 text-xl leading-none">#</span>
                    <h2 className="text-base sm:text-lg font-semibold text-indigo-300">
                      {selectedRoom.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-2 bg-slate-700/70 text-indigo-200 px-3 py-1 rounded text-xs">
                      <Truck className="h-3.5 w-3.5 text-sky-300" />
                      <span>Vehicle ID —</span>
                    </div>
                    <div className="flex items-center gap-2 bg-red-700/60 text-red-100 px-3 py-1 rounded text-xs">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-200" />
                      <span>Door —</span>
                    </div>
                    <button
                      className="hidden sm:inline-flex items-center justify-center bg-amber-600/80 text-white w-8 h-8 rounded"
                      title="Alerts"
                    >
                      <Bell className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDocumentView("demo-doc-1")}
                      className="inline-flex items-center bg-indigo-700/40 text-indigo-300 hover:text-white hover:bg-indigo-600/60 px-3 py-1 rounded text-sm"
                    >
                      Docs
                    </button>
                    <button
                      onClick={() => handleSignatureRequest("demo-sig-1")}
                      className="inline-flex items-center bg-violet-700/40 text-violet-300 hover:text-white hover:bg-violet-600/60 px-3 py-1 rounded text-sm"
                    >
                      Sign
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <ChatWindow
              room={selectedRoom}
              user={
                (session as any)?.user ||
                (demoMode
                  ? ({
                      id: "u1",
                      name: "Demo User",
                      role: "owner",
                      status: "active",
                    } as any)
                  : undefined)
              }
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-slate-300 mb-2">
                Welcome to ChatDO
              </h2>
              <p className="text-slate-400">
                Select a channel to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Drawer - Presence and Geo Event Feed */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-slate-900 border-l border-slate-700 flex flex-col transform transition-transform duration-300 ease-in-out z-40 ${
          rightDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
          <h2 className="text-lg font-semibold text-white">
            {rightPanelView === "presence" ? "Team Members" : "Geofencing"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setRightPanelView(
                  rightPanelView === "presence" ? "geofencing" : "presence"
                )
              }
              className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
              title={`Switch to ${rightPanelView === "presence" ? "Geofencing" : "Team Members"}`}
            >
              {rightPanelView === "presence" ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
            </button>
            <button
              onClick={() => {
                console.log("Close drawer clicked");
                setRightDrawerOpen(false);
              }}
              className="p-2 hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-white"
              title="Close drawer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {rightPanelView === "presence" ? (
            <>
              <PresencePanel
                selectedRoom={selectedRoom}
                onlineUsers={onlineUsers as any}
                currentUserId={(session as any)?.user?.id || "u1"}
                onUserSelect={handleUserSelect}
                onInviteUser={handleInviteUser}
              />
              {selectedRoom && (
                <div className="h-64 border-t border-slate-700">
                  <GeoEventFeed room={selectedRoom} />
                </div>
              )}
            </>
          ) : (
            <GeofencingPanel
              geofences={geofences}
              geoEvents={geoEvents}
              selectedGeofenceId={selectedGeofenceId}
              onGeofenceSelect={handleGeofenceSelect}
              onGeofenceCreate={handleGeofenceCreate}
              onGeofenceEdit={handleGeofenceEdit}
              onGeofenceDelete={handleGeofenceDelete}
              onGeofenceToggle={handleGeofenceToggle}
            />
          )}
        </div>
      </div>

      {/* Overlay for drawer */}
      {rightDrawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setRightDrawerOpen(false)}
        />
      )}

      {/* Document Editor Modal */}
      {documentEditorOpen && currentDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl h-[90vh] bg-white rounded-lg shadow-xl">
            <DocumentEditor
              documentId={currentDocument.documentId}
              title={currentDocument.title}
              content={currentDocument.content}
              isEditable={true}
              collaborators={currentDocument.collaborators || []}
              onContentChange={handleDocumentContentChange}
              onTitleChange={handleDocumentTitleChange}
              onSave={handleDocumentSave}
              onShare={handleDocumentShare}
              onDownload={handleDocumentDownload}
            />
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {signatureModalOpen && currentSignature && (
        <SignatureModal
          isOpen={true}
          onClose={handleSignatureCancel}
          onSave={handleSignatureSubmit}
          documentTitle={currentSignature.documentTitle}
          signerName={currentSignature.signerName}
          signerEmail={currentSignature.signerEmail}
        />
      )}
    </div>
  );
}

// Disable SSR for this complex real-time page to avoid hydration mismatches
export default AppPageImpl;

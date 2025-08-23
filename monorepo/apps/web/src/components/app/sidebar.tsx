"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Search, Hash, Lock } from "lucide-react";
import type { Room, User } from "@/types";

type SidebarProps = {
  rooms: Room[];
  selectedRoom: Room | null;
  onRoomSelectAction: (room: Room) => void;
  onCreateChannelAction?: (name: string, type: "public" | "private") => void;
  onDocumentViewAction?: (documentId: string) => void;
  onActivityViewAction?: () => void;
  onDirectMessageAction?: (userId: string) => void;
  user?: User | null;
  collapsed?: boolean;
  className?: string;
};

/**
 * Sidebar
 * -------
 * Left-hand room selector with search and unread badges.
 * - Filters rooms by name via a simple client-side search.
 * - Highlights the currently selected room.
 * - Uses onRoomSelectAction (function name ends with Action to satisfy Next.js client rules).
 */
export function Sidebar({
  rooms,
  selectedRoom,
  onRoomSelectAction,
  onCreateChannelAction,
  onDocumentViewAction,
  onActivityViewAction,
  onDirectMessageAction,
  collapsed = false,
  user,
  className,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      rooms.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())),
    [rooms, query]
  );

  return (
    <div className={cn("flex h-full flex-col bg-slate-900", className)}>
      {/* Text Channels Section */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 mb-3">
          {!collapsed && (
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Text Channels
            </span>
          )}
          {!collapsed && (
            <button
              className="ml-auto p-1 hover:bg-slate-700 rounded"
              onClick={() => onCreateChannelAction?.("new-channel", "public")}
              title="Create Channel"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="space-y-1">
          <button
            onClick={() =>
              onRoomSelectAction(
                rooms.find((r) => r.name === "general") || rooms[0]
              )
            }
            className={cn(
              "w-full text-left rounded px-2 py-1 hover:bg-slate-700 flex items-center gap-2 transition-colors text-sm",
              selectedRoom?.name === "general"
                ? "bg-slate-700 text-white"
                : "text-slate-300",
              collapsed && "justify-center px-1"
            )}
            title={collapsed ? "General" : undefined}
          >
            <Hash className="h-4 w-4 text-slate-400" />
            {!collapsed && <span className="font-medium">General</span>}
          </button>
        </div>
      </div>

      {/* View All Channels */}
      {!collapsed && (
        <div className="px-3 py-1">
          <button className="w-full text-left rounded px-2 py-1 hover:bg-slate-700 flex items-center gap-2 transition-colors text-sm text-slate-300">
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>View All Channels</span>
          </button>
        </div>
      )}

      {/* Direct Messages Section */}
      <div className="px-3 py-2 mt-4">
        <div className="flex items-center gap-2 mb-3">
          {!collapsed && (
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Direct Messages
            </span>
          )}
          {!collapsed && (
            <button
              className="ml-auto p-1 hover:bg-slate-700 rounded"
              onClick={() => onDirectMessageAction?.("new-dm")}
              title="Start Direct Message"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="space-y-1">
          <button
            className={cn(
              "w-full text-left rounded px-2 py-1 hover:bg-slate-700 flex items-center gap-2 transition-colors text-sm text-slate-300",
              collapsed && "justify-center px-1"
            )}
            onClick={() => onDirectMessageAction?.("user-1")}
            title={collapsed ? "Direct Messages" : undefined}
          >
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {!collapsed && <span>Direct Messages</span>}
          </button>
        </div>
      </div>

      {/* Documents Section */}
      <div className="px-3 py-2 mt-4">
        {!collapsed && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Documents
            </span>
          </div>
        )}

        <div className="space-y-1">
          <button
            className={cn(
              "w-full text-left rounded px-2 py-1 hover:bg-slate-700 flex items-center gap-2 transition-colors text-sm text-slate-300",
              collapsed && "justify-center px-1"
            )}
            onClick={() => onDocumentViewAction?.("doc-1")}
            title={collapsed ? "Documents" : undefined}
          >
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {!collapsed && <span>Documents</span>}
          </button>
        </div>
      </div>

      {/* Activity Section */}
      <div className="px-3 py-2 mt-4">
        <button
          className={cn(
            "w-full text-left rounded px-2 py-1 hover:bg-slate-700 flex items-center gap-2 transition-colors text-sm text-slate-300",
            collapsed && "justify-center px-1"
          )}
          onClick={() => onActivityViewAction?.()}
          title={collapsed ? "Activity" : undefined}
        >
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-5 5v-5zM9 7V2H4v5h5z"
            />
          </svg>
          {!collapsed && <span>Activity</span>}
        </button>
      </div>

      {/* User Info at Bottom */}
      <div className="mt-auto border-t border-slate-700 p-3">
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed && "justify-center"
          )}
        >
          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-white">
              {user?.name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "DU"}
            </span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {user?.name || "Demo User"}
                </div>
                <div className="text-xs text-slate-400">
                    {(user as any)?.email ?? "demo@chatdo.com"}
                </div>
              </div>
              <button className="p-1 hover:bg-slate-700 rounded">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Room } from "@/types";
import { usePhoenix } from "@/lib/phoenix/context";

/**
 * GeoEventFeed
 * ------------
 * Renders a simple list of validated geofencing events for a trip room.
 * Subscribes to Phoenix topic "room:{tripId}:geo" for live updates.
 * Server pushes are emitted only after validation on the API side.
 */
export function GeoEventFeed({
  room,
  className,
}: {
  room: Room;
  className?: string;
}) {
  const [events, setEvents] = useState<
    Array<{ userId: string; geofenceId: string; eventType: string; ts: number }>
  >([]);
  const { joinRoom, leaveRoom } = usePhoenix();
  const topic = `room:${room.id}:geo`;

  useEffect(() => {
    const ch = joinRoom(topic);
    if (!ch) return;

    ch.on("geo_event", (payload: any) => {
      setEvents((prev) => [payload, ...prev].slice(0, 200));
    });

    return () => leaveRoom(topic);
  }, [topic]);

  return (
    <div className={cn("flex flex-col h-full bg-slate-900", className)}>
      <div className="px-4 py-2 border-b border-slate-700 text-sm font-medium text-white">
        Geofencing Events
      </div>
      <ScrollArea className="flex-1 p-3">
        {events.length === 0 ? (
          <div className="text-xs text-slate-400">No geofencing events yet</div>
        ) : (
          <ul className="space-y-2">
            {events.map((e, idx) => (
              <li key={idx} className="text-sm text-slate-300">
                <span className="font-medium text-white">{e.userId}</span>{" "}
                <span
                  className={
                    e.eventType === "enter" ? "text-green-400" : "text-red-400"
                  }
                >
                  {e.eventType === "enter" ? "entered" : "exited"}
                </span>{" "}
                geofence{" "}
                <span className="font-mono text-blue-400">{e.geofenceId}</span>
                <div className="text-xs text-slate-500 mt-1">
                  {new Date(e.ts).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

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
    <div className={cn("flex flex-col h-full", className)}>
      <div className="px-4 py-2 border-b text-sm font-medium text-slate-700">
        Geofencing
      </div>
      <ScrollArea className="flex-1 p-3">
        {events.length === 0 ? (
          <div className="text-xs text-slate-500">No geofencing events yet</div>
        ) : (
          <ul className="space-y-2">
            {events.map((e, idx) => (
              <li key={idx} className="text-sm text-slate-700">
                <span className="font-medium">{e.userId}</span>{" "}
                {e.eventType === "enter" ? "entered" : "exited"} geofence{" "}
                <span className="font-mono">{e.geofenceId}</span> at{" "}
                {new Date(e.ts).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

"use client";

/**
 * Phoenix Context
 * ---------------
 * Provides a React context for a single Phoenix Socket instance across the app.
 * - connect(token): opens a socket to NEXT_PUBLIC_PHOENIX_WS_URL using a JWT bearer token.
 * - disconnect(): gracefully closes the socket.
 * - isConnected: simple flag for UI toggles.
 *
 * TODOs:
 * - Add Channel subscription helpers (joinRoom, leaveRoom, pushMessage, typing events, presence).
 * - Reconnect/backoff strategies and token refresh handling.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { Socket, Channel } from "phoenix";

interface PhoenixContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  // Channel helpers
  joinRoom: (topic: string, params?: Record<string, any>) => Channel | null;
  leaveRoom: (topic: string) => void;
  push: (topic: string, event: string, payload?: any) => void;
}

const PhoenixContext = createContext<PhoenixContextType | null>(null);

interface PhoenixProviderProps {
  children: ReactNode;
}

export function PhoenixProvider({ children }: PhoenixProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Track active channels by topic to reuse and manage lifecycles
  const channelsRef = useRef<Map<string, Channel>>(new Map());

  const connect = (token: string) => {
    if (socket) {
      disconnect();
    }

    // IMPORTANT: must be NEXT_PUBLIC_* to be accessible in the browser
    const wsUrl =
      process.env.NEXT_PUBLIC_PHOENIX_WS_URL || "ws://localhost:4000/socket";
    const newSocket = new Socket(wsUrl, {
      params: { token },
      logger: (kind: string, msg: string, data: unknown) => {
        if (process.env.NODE_ENV === "development") {
          console.log(`${kind}: ${msg}`, data);
        }
      },
    });

    newSocket.onOpen(() => {
      setIsConnected(true);
      console.log("Phoenix socket connected");
    });

    newSocket.onClose(() => {
      setIsConnected(false);
      console.log("Phoenix socket disconnected");
    });

    newSocket.onError((error: unknown) => {
      setIsConnected(false);
      console.error("Phoenix socket error:", error);
    });

    newSocket.connect();
    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      // Leave all channels before disconnecting
      channelsRef.current.forEach((ch, topic) => {
        try {
          ch.leave();
        } catch {}
      });
      channelsRef.current.clear();
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Channel helpers with detailed logs for easier debugging
  const joinRoom = (topic: string, params?: Record<string, any>) => {
    if (!socket) {
      console.warn("joinRoom called without socket");
      return null;
    }
    let ch = channelsRef.current.get(topic);
    if (!ch) {
      ch = socket.channel(topic, params);
      channelsRef.current.set(topic, ch);
      ch.join()
        .receive("ok", () => console.log(`[phoenix] joined ${topic}`))
        .receive("error", (e: any) =>
          console.error(`[phoenix] failed join ${topic}`, e)
        )
        .receive("timeout", () =>
          console.error(`[phoenix] timeout join ${topic}`)
        );
    }
    return ch;
  };

  const leaveRoom = (topic: string) => {
    const ch = channelsRef.current.get(topic);
    if (ch) {
      try {
        ch.leave();
      } catch {}
      channelsRef.current.delete(topic);
      console.log(`[phoenix] left ${topic}`);
    }
  };

  const push = (topic: string, event: string, payload?: any) => {
    const ch = channelsRef.current.get(topic);
    if (!ch) {
      console.warn(`[phoenix] push on missing channel ${topic}`);
      return;
    }
    ch.push(event, payload);
  };

  const value: PhoenixContextType = {
    socket,
    isConnected,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    push,
  };

  return (
    <PhoenixContext.Provider value={value}>{children}</PhoenixContext.Provider>
  );
}

export function usePhoenix() {
  const context = useContext(PhoenixContext);
  if (!context) {
    throw new Error("usePhoenix must be used within a PhoenixProvider");
  }
  return context;
}

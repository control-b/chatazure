"use client";

import { SessionProvider } from "next-auth/react";
import { PhoenixProvider } from "@/lib/phoenix/context";
import { ThemeProvider } from "@/components/theme-provider";
import { useEffect } from "react";
import { registerServiceWorker, devForceUnregisterAllServiceWorkers } from "@/lib/pwa";
import { usePhoenix } from "@/lib/phoenix/context";
import { useSession } from "next-auth/react";

/**
 * PhoenixAutoConnect
 * ------------------
 * Small helper component that lives inside PhoenixProvider so it can access the Phoenix context.
 * It listens for a valid NextAuth session (JWT strategy) and connects the Phoenix socket with
 * the access token (bearer) as a param. On logout or token loss, it disconnects.
 */
function PhoenixAutoConnect() {
  const { data: session, status } = useSession();
  const { connect, disconnect, isConnected } = usePhoenix();
  const isDemo =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("demo") === "1";

  useEffect(() => {
    // Demo mode: connect with a dev token
    if (isDemo) {
      connect("dev");
      return () => disconnect();
    }
    // Only attempt connection when authenticated and a token exists
    const token = (session as any)?.accessToken as string | undefined;
    if (status === "authenticated" && token) {
      connect(token);
      return () => disconnect();
    }
    // If user is not authenticated, ensure we’re disconnected
    if (status === "unauthenticated" && isConnected) {
      disconnect();
    }
  }, [status, (session as any)?.accessToken, isDemo]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {/* PhoenixProvider exposes socket context to the app. See src/lib/phoenix/context.tsx */}
        <PhoenixProvider>
          {/* Register SW early so online/offline events work reliably */}
          <SWRegister />
          {/*
            Auto-connect the Phoenix WebSocket once the NextAuth session is available.
            This keeps real-time features (chat, typing indicators, presence) in sync.
          */}
          <PhoenixAutoConnect />
          {children}
        </PhoenixProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

function SWRegister() {
  useEffect(() => {
    // Allow disabling SW via env flag in dev
    const disableSW =
      process.env.NEXT_PUBLIC_DISABLE_SW === '1' ||
      (typeof window !== 'undefined' &&
        (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.endsWith('.local')));

    if (disableSW) {
      // Clean up any stale SW and caches that Safari might still hold onto
      // Only do this once per origin to avoid controllerchange-induced reload loops in Safari
      try {
        const key = '__swCleanupDone__';
        const alreadyDone = typeof window !== 'undefined' && localStorage.getItem(key) === '1';
        const hasController = typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller;
        if (!alreadyDone && hasController) {
          devForceUnregisterAllServiceWorkers().finally(() => {
            try { localStorage.setItem(key, '1'); } catch {}
          });
        }
      } catch {}
      return;
    }

    let cancelled = false;
    (async () => {
      const reg = await registerServiceWorker();
      if (cancelled) return;
      // no-op; registration is handled in pwa.ts
    })();

    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

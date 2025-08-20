'use client'

import { SessionProvider } from 'next-auth/react'
import { PhoenixProvider } from '@/lib/phoenix/context'
import { ThemeProvider } from '@/components/theme-provider'
import { useEffect } from 'react'
import { usePhoenix } from '@/lib/phoenix/context'
import { useSession } from 'next-auth/react'

/**
 * PhoenixAutoConnect
 * ------------------
 * Small helper component that lives inside PhoenixProvider so it can access the Phoenix context.
 * It listens for a valid NextAuth session (JWT strategy) and connects the Phoenix socket with
 * the access token (bearer) as a param. On logout or token loss, it disconnects.
 */
function PhoenixAutoConnect() {
  const { data: session, status } = useSession()
  const { connect, disconnect, isConnected } = usePhoenix()
  const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1'

  useEffect(() => {
    // Demo mode: connect with a dev token
    if (isDemo) {
      connect('dev')
      return () => disconnect()
    }
    // Only attempt connection when authenticated and a token exists
    const token = (session as any)?.accessToken as string | undefined
    if (status === 'authenticated' && token) {
      connect(token)
      return () => disconnect()
    }
    // If user is not authenticated, ensure we’re disconnected
    if (status === 'unauthenticated' && isConnected) {
      disconnect()
    }
  }, [status, (session as any)?.accessToken, isDemo])

  return null
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
          {/*
            Auto-connect the Phoenix WebSocket once the NextAuth session is available.
            This keeps real-time features (chat, typing indicators, presence) in sync.
          */}
          <PhoenixAutoConnect />
          {children}
        </PhoenixProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}

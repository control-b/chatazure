'use client'

import Link from 'next/link'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Sign in</h1>
        <p className="text-gray-600 mb-6">Choose how you want to continue.</p>

        <div className="space-y-3">
          <Link
            href="/api/auth/signin"
            className="block w-full text-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Continue with Azure AD B2C
          </Link>

          <Link
            href="/app?demo=1"
            className="block w-full text-center px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Try demo (no auth)
          </Link>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Demo mode shows mocked rooms and presence to let you explore the interface without configuring identity.
        </p>
      </div>
    </div>
  )
}

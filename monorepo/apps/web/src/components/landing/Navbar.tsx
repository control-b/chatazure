import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-xl supports-[backdrop-filter]:bg-gray-950/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-white">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FL</span>
            </div>
            <span className="text-lg font-bold tracking-tight">FleetLink</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <a href="#messaging" className="hover:text-white transition-colors">
              Messaging
            </a>
            <a href="#documents" className="hover:text-white transition-colors">
              Documents
            </a>
            <a href="#esign" className="hover:text-white transition-colors">
              E‑Sign
            </a>
            <a
              href="#geofencing"
              className="hover:text-white transition-colors"
            >
              Geofencing
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="hidden sm:inline-flex rounded-lg px-4 py-2 text-sm font-medium text-slate-200 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signin"
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-b from-gray-950 to-black border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Company info */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 text-white mb-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg flex items-center justify-center">
                <span className="text-white font-bold">FL</span>
              </div>
              <span className="text-xl font-bold">FleetLink</span>
            </Link>
            <p className="text-slate-400 mb-6 max-w-md leading-relaxed">
              The complete communication and logistics platform built
              specifically for trucking companies. Connect your fleet,
              streamline operations, and deliver better results.
            </p>

            {/* Social links */}
            <div className="flex gap-4">
              {[
                { icon: "📧", label: "Email" },
                { icon: "💼", label: "LinkedIn" },
                { icon: "🐦", label: "Twitter" },
                { icon: "📱", label: "Mobile" },
              ].map((social, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-300 hover:scale-110 hover:-translate-y-0.5"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-3 text-slate-400">
              {[
                "Real-time Messaging",
                "Document Management",
                "E-Signatures",
                "Geofencing",
                "Fleet Tracking",
                "Load Management",
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-3 text-slate-400">
              {[
                "About Us",
                "Careers",
                "Press",
                "Partners",
                "Contact",
                "Blog",
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-3 text-slate-400">
              {[
                "Help Center",
                "Documentation",
                "API Reference",
                "System Status",
                "Training",
                "Community",
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href="#"
                    className="hover:text-white transition-colors duration-200"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact info */}
        <div className="border-t border-white/10 pt-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                📞
              </div>
              <div>
                <div className="text-white font-medium">Sales</div>
                <div className="text-sm">1-800-FLEET-01</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                💬
              </div>
              <div>
                <div className="text-white font-medium">Support</div>
                <div className="text-sm">24/7 Chat Available</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                📍
              </div>
              <div>
                <div className="text-white font-medium">Headquarters</div>
                <div className="text-sm">Chicago, IL</div>
              </div>
            </div>
          </div>
        </div>

        {/* Compliance badges */}
        <div className="border-t border-white/10 pt-8 mb-8">
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { label: "SOC 2 Compliant", icon: "🔒" },
              { label: "FMCSA Approved", icon: "🚛" },
              { label: "DOT Certified", icon: "✅" },
              { label: "GDPR Ready", icon: "🌍" },
            ].map((badge, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-slate-400 text-sm"
              >
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom footer */}
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-slate-400 text-sm">
            © {currentYear} FleetLink. All rights reserved.
          </div>
          <div className="flex flex-wrap gap-6 text-slate-400 text-sm">
            <Link href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-white transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

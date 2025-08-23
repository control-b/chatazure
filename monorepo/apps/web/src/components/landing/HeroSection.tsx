import Link from "next/link";

export default function HeroSection() {
  const messages = [
    {
      sender: "Dispatch",
      message: "Truck 247 arriving at warehouse",
      time: "2:34 PM",
    },
    {
      sender: "Driver Mike",
      message: "Delivered load LA-001, BOL signed",
      time: "2:35 PM",
    },
    {
      sender: "Broker Team",
      message: "New load available CHI-MIA",
      time: "2:36 PM",
    },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden bg-gradient-to-br from-slate-950 via-gray-950 to-black">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/30 via-gray-950/30 to-black/30" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Connect
              </span>{" "}
              your fleet
              <br />
              like never before
            </h1>

            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Real-time messaging, document management, e-signing, and
              geofencing built specifically for trucking and logistics teams.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/signin"
                className="group relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/25"
              >
                <span className="relative z-10">Start Free Trial</span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>

              <Link
                href="#messaging"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-8 py-4 text-lg font-semibold text-white hover:bg-white/10 transition-all duration-300"
              >
                Watch Demo
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap justify-center lg:justify-start items-center gap-6 text-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                Setup in minutes
              </div>
            </div>
          </div>

          {/* Demo Chat Interface */}
          <div className="relative">
            <div className="relative">
              {/* Phone mockup */}
              <div className="mx-auto w-80 h-[600px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-[3rem] p-3 shadow-2xl border border-white/10">
                {/* Phone screen */}
                <div className="w-full h-full bg-black rounded-[2.5rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="flex justify-between items-center px-6 py-3 text-white text-sm">
                    <span>9:41</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>

                  {/* App header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600">
                    <h3 className="text-white font-bold text-lg">FleetLink</h3>
                    <p className="text-cyan-100 text-sm">
                      Route 47A • 3 active
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="px-4 py-6 space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-2xl max-w-[280px] ${
                          index % 2 === 0
                            ? "bg-gray-800 text-white mr-auto"
                            : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white ml-auto"
                        }`}
                      >
                        <div className="text-xs opacity-75 mb-1">
                          {message.sender}
                        </div>
                        <div className="text-sm">{message.message}</div>
                        <div className="text-xs opacity-75 text-right mt-1">
                          {message.time}
                        </div>
                      </div>
                    ))}

                    {/* Typing indicator */}
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      </div>
                      Someone is typing...
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating indicators */}
              <div className="absolute -top-4 -left-4 bg-gradient-to-r from-green-400 to-cyan-400 text-black px-3 py-2 rounded-xl text-sm font-semibold shadow-lg">
                🚛 Live GPS
              </div>

              <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-blue-400 to-purple-400 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-lg">
                📄 E-Sign Ready
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

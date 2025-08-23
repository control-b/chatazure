export default function GeofencingSection() {
  return (
    <section
      id="geofencing"
      className="relative min-h-screen flex items-center py-20 overflow-hidden bg-gradient-to-l from-black via-gray-950 to-slate-950"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-l from-gray-950/30 via-slate-950/30 to-black/30" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Demo */}
          <div className="relative order-2 lg:order-1">
            <div className="relative">
              {/* Map interface */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold text-lg">
                    Live Fleet Tracking
                  </h3>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <span className="text-green-400 text-sm">12 Active</span>
                  </div>
                </div>

                {/* Map area */}
                <div className="bg-slate-700 rounded-lg p-4 mb-6 h-64 relative overflow-hidden">
                  {/* Map grid */}
                  <div className="absolute inset-0 opacity-20">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className="border-l border-gray-600 absolute h-full"
                        style={{ left: `${i * 10}%` }}
                      />
                    ))}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="border-t border-gray-600 absolute w-full"
                        style={{ top: `${i * 12.5}%` }}
                      />
                    ))}
                  </div>

                  {/* Geofence areas */}
                  <div
                    className="absolute border-2 border-green-400/80 bg-green-400/10 rounded-lg"
                    style={{
                      left: "40%",
                      top: "25%",
                      width: "20%",
                      height: "50%",
                    }}
                  >
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-white text-xs font-medium">
                      Chicago Warehouse
                    </div>
                  </div>

                  {/* Other geofences */}
                  <div
                    className="absolute border-2 border-blue-400/40 bg-blue-400/05 rounded-lg"
                    style={{
                      left: "70%",
                      top: "40%",
                      width: "15%",
                      height: "30%",
                    }}
                  >
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-blue-400 text-xs">
                      Rest Stop
                    </div>
                  </div>

                  {/* Truck */}
                  <div
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: "50%", top: "50%" }}
                  >
                    <div className="relative">
                      <div className="text-2xl transform rotate-90">🚛</div>
                      <div className="absolute -top-2 -left-2 w-8 h-8 border-2 border-green-400 rounded-full"></div>
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
                        Truck 247
                      </div>
                    </div>
                  </div>

                  {/* Route line */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400/50 to-blue-400/50 transform -translate-y-1/2" />
                </div>

                {/* Notifications panel */}
                <div className="space-y-2">
                  <div className="text-white font-medium text-sm mb-2">
                    Recent Events
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg text-xs bg-green-400/20 border border-green-400/30">
                    <div className="text-lg">🟢</div>
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        Truck 247 entered Chicago Warehouse
                      </div>
                      <div className="text-slate-400">
                        {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 rounded-lg text-xs bg-blue-400/20 border border-blue-400/30">
                    <div className="text-lg">�</div>
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        Loading started at dock 3
                      </div>
                      <div className="text-slate-400">
                        {new Date(Date.now() - 300000).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time indicator */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-orange-400 to-red-400 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-lg">
                📡 Live Tracking
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Smart geofencing
              </span>
              <br />
              for logistics
            </h2>

            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Automate check-ins, track dwell times, and optimize routes with
              intelligent geofencing designed for warehouses, truck stops, and
              customer locations.
            </p>

            <div className="space-y-6">
              {[
                {
                  icon: "📍",
                  title: "Precision Geofences",
                  description:
                    "Custom polygonal boundaries for any location with meter-level accuracy",
                },
                {
                  icon: "⚡",
                  title: "Instant Notifications",
                  description:
                    "Real-time alerts for arrivals, departures, and dwell time violations",
                },
                {
                  icon: "📊",
                  title: "Analytics Dashboard",
                  description:
                    "Track detention times, route efficiency, and driver performance",
                },
                {
                  icon: "🔗",
                  title: "TMS Integration",
                  description:
                    "Automatic updates to load status and customer notifications",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 rounded-xl border border-white/10 hover:border-orange-400/30 transition-all duration-300"
                >
                  <div className="text-2xl">{feature.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function MessagingSection() {
  const features = [
    {
      title: "Multi-Channel Communication",
      description:
        "Dedicated channels for dispatch, drivers, brokers, and loads",
    },
    {
      title: "Real-time Location Sharing",
      description: "Live GPS tracking and ETA updates in chat",
    },
    {
      title: "File & Document Sharing",
      description: "Share BOLs, invoices, and photos instantly",
    },
  ];

  return (
    <section
      id="messaging"
      className="relative min-h-screen flex items-center py-20 overflow-hidden bg-gradient-to-r from-black via-slate-950 to-gray-950"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-gray-950/30 to-black/30" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Instant messaging
              </span>
              <br />
              built for logistics
            </h2>

            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Keep your entire fleet connected with purpose-built messaging that
              understands the trucking industry.
            </p>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border transition-all duration-500 cursor-pointer ${
                    index === 0
                      ? "border-cyan-400/50 bg-cyan-400/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Demo Interface */}
          <div className="relative">
            <div className="relative">
              {/* Main chat interface */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-white/10">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="ml-4 text-white font-medium">
                    FleetLink Dispatch
                  </span>
                </div>

                {/* Channel list */}
                <div className="space-y-2 mb-6">
                  {[
                    "# dispatch-central",
                    "# load-chi-001",
                    "# driver-updates",
                  ].map((channel, index) => (
                    <div
                      key={channel}
                      className={`flex items-center gap-3 p-2 rounded-lg border ${
                        index === 0
                          ? "bg-cyan-400/10 border-cyan-400/30"
                          : "border-white/10"
                      }`}
                    >
                      <span className="text-cyan-400">#</span>
                      <span className="text-white text-sm">{channel}</span>
                      {index === 0 && (
                        <span className="ml-auto bg-cyan-400 text-black text-xs px-2 py-1 rounded-full">
                          3
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Messages area */}
                <div className="bg-black/30 rounded-lg p-4 h-40 overflow-hidden">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-cyan-400"></div>
                      <div>
                        <div className="text-green-400 text-xs">
                          Dispatcher Sarah
                        </div>
                        <div className="text-white text-sm">
                          Load CHI-001 ready for pickup
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"></div>
                      <div>
                        <div className="text-blue-400 text-xs">Driver Mike</div>
                        <div className="text-white text-sm">
                          En route, ETA 15 minutes
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating indicators */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-400 to-cyan-400 text-black px-3 py-2 rounded-xl text-sm font-semibold shadow-lg">
                ✓ Message Delivered
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

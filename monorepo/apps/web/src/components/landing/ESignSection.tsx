export default function ESignSection() {
  const signers = [
    {
      name: "Mike Rodriguez",
      role: "Driver",
      avatar: "👨‍🚚",
      signed: true,
      location: "Chicago, IL",
    },
    {
      name: "Sarah Johnson",
      role: "Dispatcher",
      avatar: "👩‍💼",
      signed: true,
      location: "HQ Dallas",
    },
    {
      name: "Alex Chen",
      role: "Broker",
      avatar: "👨‍💻",
      signed: false,
      location: "Remote",
    },
  ];

  return (
    <section
      id="esign"
      className="relative min-h-screen flex items-center py-20 overflow-hidden bg-gradient-to-r from-black via-slate-950 to-gray-950"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-gray-950/30 to-black/30" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                E-signatures
              </span>
              <br />
              made for the road
            </h2>

            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Get documents signed on any device, anywhere. GPS-stamped, legally
              binding signatures that work in truck cabs, loading docks, and
              broker offices.
            </p>

            <div className="space-y-6">
              {[
                {
                  icon: "📱",
                  title: "Mobile-First Signing",
                  description:
                    "Optimized for smartphones and tablets with large signature areas",
                },
                {
                  icon: "🌍",
                  title: "GPS Location Stamping",
                  description:
                    "Every signature includes precise location and timestamp data",
                },
                {
                  icon: "🔒",
                  title: "Legally Binding",
                  description:
                    "ESIGN Act compliant with tamper-evident PDF sealing",
                },
                {
                  icon: "⚡",
                  title: "Instant Notifications",
                  description:
                    "Real-time alerts when documents are signed and completed",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="flex gap-4 p-4 rounded-xl border border-white/10 hover:border-emerald-400/30 transition-all duration-300"
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

          {/* Demo */}
          <div className="relative">
            <div className="relative">
              {/* E-signature interface */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-semibold text-lg">
                    Bill of Lading - CHI001
                  </h3>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <span className="text-yellow-400 text-sm">
                      Awaiting Signature
                    </span>
                  </div>
                </div>

                {/* Document preview */}
                <div className="bg-white rounded-lg p-4 mb-6 h-40 relative overflow-hidden">
                  <div className="text-black text-sm space-y-2">
                    <div className="font-bold">BILL OF LADING</div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="font-medium">From:</div>
                        <div>Chicago Warehouse</div>
                        <div>1234 Industrial Dr</div>
                      </div>
                      <div>
                        <div className="font-medium">To:</div>
                        <div>Miami Distribution</div>
                        <div>5678 Commerce Blvd</div>
                      </div>
                    </div>
                  </div>

                  {/* Signature line */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="border-b-2 border-gray-300 pb-1">
                      <div className="text-blue-600 font-script text-lg">
                        Mike Rodriguez
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Driver Signature
                    </div>
                  </div>
                </div>

                {/* Signers list */}
                <div className="space-y-3">
                  {signers.map((signer, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-4 p-3 rounded-lg border ${
                        signer.signed
                          ? "bg-green-400/10 border-green-400/30"
                          : "bg-black/30 border-white/10"
                      }`}
                    >
                      <div className="text-2xl">{signer.avatar}</div>
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm">
                          {signer.name}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {signer.role} • {signer.location}
                        </div>
                      </div>
                      <div className="text-right">
                        {signer.signed ? (
                          <div className="text-green-400 text-sm">✓ Signed</div>
                        ) : (
                          <div className="text-yellow-400 text-sm">
                            ⏳ Pending
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-white">Completion Progress</span>
                    <span className="text-emerald-400">
                      {Math.round(
                        (signers.filter((s) => s.signed).length /
                          signers.length) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-teal-400 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(signers.filter((s) => s.signed).length / signers.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* GPS location indicator */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-emerald-400 to-teal-400 text-black px-3 py-2 rounded-xl text-sm font-semibold shadow-lg">
                📍 GPS Verified
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

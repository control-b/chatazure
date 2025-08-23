export default function TrustSection() {
  return (
    <section id="trust" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold text-white">
            Enterprise‑grade trust
          </h2>
          <p className="mt-3 text-slate-300">
            SSO with Microsoft, Google, and Azure AD B2C. Encryption at rest and
            in transit, with full audit trails.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4 text-slate-200">
          <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4 text-sm">
            SOC 2 Type II
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4 text-sm">
            GDPR & CCPA
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4 text-sm">
            HIPAA‑ready
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4 text-sm">
            99.99% uptime
          </div>
        </div>
      </div>
    </section>
  );
}

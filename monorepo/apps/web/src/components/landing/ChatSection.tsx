export default function ChatSection() {
  return (
    <section id="chat" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold text-white">
            Purpose‑built chat for freight
          </h2>
          <p className="mt-3 text-slate-300">
            Tenant‑aware rooms, delivery receipts, presence, and file drops.
            Keep brokers, carriers, and drivers aligned in seconds.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-6 md:p-10">
              <ul className="space-y-4 text-slate-200 text-sm">
                <li>• Multi‑tenant access with RBAC</li>
                <li>• Read receipts and reactions</li>
                <li>• Large file uploads with resumable chunks</li>
                <li>• Message pinning and threads</li>
                <li>• Mobile‑first UI</li>
              </ul>
            </div>
            <div className="p-6 md:p-10 border-t md:border-t-0 md:border-l border-white/10">
              <p className="text-slate-300 text-sm">
                No images previewed on this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

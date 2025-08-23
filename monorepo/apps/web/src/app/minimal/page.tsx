export default function MinimalDemo() {
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Chat Demo - Minimal</h1>
      <div className="grid grid-cols-3 gap-4 h-96">
        {/* Left Sidebar */}
        <div className="bg-slate-900 border border-slate-700 rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Channels</h2>
          <div className="space-y-2">
            <div className="p-2 bg-slate-800 rounded"># general</div>
            <div className="p-2 hover:bg-slate-800 rounded"># operations</div>
            <div className="p-2 hover:bg-slate-800 rounded"># dispatch</div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="bg-slate-900 border border-slate-700 rounded p-4">
          <h2 className="text-lg font-semibold mb-4"># general</h2>
          <div className="space-y-3 mb-4">
            <div className="p-2 bg-slate-800 rounded">
              <div className="text-sm text-slate-400">Dispatcher</div>
              <div>Truck 247 arriving at warehouse</div>
            </div>
            <div className="p-2 bg-blue-600 rounded ml-8">
              <div className="text-sm text-blue-200">Driver Mike</div>
              <div>Delivered load LA-001, BOL signed</div>
            </div>
          </div>
          <input
            type="text"
            placeholder="Type a message..."
            className="w-full p-2 bg-slate-800 border border-slate-600 rounded"
          />
        </div>

        {/* Right Panel */}
        <div className="bg-slate-900 border border-slate-700 rounded p-4">
          <h2 className="text-lg font-semibold mb-4">Team</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Alex Owner</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Dana Dispatcher</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Chris Driver</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-500 mt-1">Configure your Gorgias connection</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Gorgias API Configuration</h3>
        <p className="text-gray-500 text-sm mb-6">
          Add your Gorgias API credentials to pull data automatically.
          Until then, you can manually add data from the Tickets page.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
            <input
              type="text"
              placeholder="your-company"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="you@company.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              placeholder="Your Gorgias API key"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled
            />
          </div>
          <p className="text-xs text-gray-400">
            API integration coming soon. For now, use manual data entry.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/", icon: "📊" },
  { label: "Analytics", href: "/analytics", icon: "📈" },
  { label: "Tickets", href: "/tickets", icon: "🎫" },
  { label: "Agents", href: "/agents", icon: "👥" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-6 flex flex-col">
      <div className="mb-10">
        <h1 className="text-xl font-bold">Gorgias Insights</h1>
        <p className="text-gray-400 text-sm mt-1">Support Analytics</p>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="pt-6 border-t border-gray-700">
        <p className="text-gray-400 text-xs">Connected to Gorgias</p>
        <p className="text-gray-500 text-xs mt-1">Data refreshes every 5 min</p>
      </div>
    </aside>
  );
}

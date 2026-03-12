"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTickets } from "@/lib/ticket-store";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Insights", href: "/insights" },
  { label: "Agents", href: "/agents" },
  { label: "Email Analysis", href: "/email-analysis" },
  { label: "Upload Data", href: "/upload" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { tickets, fileName } = useTickets();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-6 flex flex-col shrink-0">
      <div className="mb-10">
        <h1 className="text-xl font-bold tracking-tight">Wamsutta Insights</h1>
        <p className="text-gray-400 text-sm mt-1">Support Intelligence</p>
      </div>

      <nav className="flex-1">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="pt-6 border-t border-gray-700 space-y-2">
        {tickets.length > 0 ? (
          <>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-green-400 text-xs font-medium">Data loaded</p>
            </div>
            <p className="text-gray-400 text-xs">{tickets.length} tickets analyzed</p>
            {fileName && <p className="text-gray-500 text-xs truncate">{fileName}</p>}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <p className="text-yellow-400 text-xs font-medium">No data</p>
            </div>
            <p className="text-gray-500 text-xs">Upload a CSV to get started</p>
          </>
        )}
      </div>
    </aside>
  );
}

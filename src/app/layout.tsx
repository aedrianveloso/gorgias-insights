import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { TicketProvider } from "@/lib/ticket-store";

export const metadata: Metadata = {
  title: "Gorgias Insights",
  description: "Analytics dashboard for Gorgias support data — better than Gorgias built-in",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <TicketProvider>
          <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 p-8 overflow-auto">{children}</main>
          </div>
        </TicketProvider>
      </body>
    </html>
  );
}

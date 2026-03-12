import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Gorgias Insights",
  description: "Analytics dashboard for Gorgias support data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

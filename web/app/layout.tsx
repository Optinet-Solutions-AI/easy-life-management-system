import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Easy Life Management System",
  description: "Property management dashboard for Easy Life / DreamT-CO",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full bg-slate-50 text-slate-900 antialiased lg:flex">
        <Sidebar />
        {/* pt-14 offsets the mobile top bar; removed on lg where sidebar is fixed inline */}
        <main className="flex-1 overflow-auto pt-14 lg:pt-0 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}

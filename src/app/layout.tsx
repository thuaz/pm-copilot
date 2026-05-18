import type { Metadata, Viewport } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "PM Copilot - PM 助手",
  description: "面向医疗行业新手 PM 的综合辅助工具",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Sidebar />
        {/* Desktop: sidebar offset. Mobile: top bar offset */}
        <main className="lg:ml-56 mt-14 lg:mt-0 min-h-screen">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}

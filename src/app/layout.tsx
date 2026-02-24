import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/lib/data-context";
import Navigation from "@/components/layout/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Baseball Ops Dashboard | 少年野球スコア分析",
  description:
    "少年野球チームのスコア管理・個人成績分析ダッシュボード。セイバーメトリクスを活用した打撃・投手成績の可視化ツール。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DataProvider>
          <Navigation />
          {/* メインコンテンツ: モバイルでは下部ナビ分のpadding、デスクトップではサイドバー分のmargin */}
          <main className="pb-20 md:pb-0 md:ml-64">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
              {children}
            </div>
          </main>
        </DataProvider>
      </body>
    </html>
  );
}

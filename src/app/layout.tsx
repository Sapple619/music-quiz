import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "🎵 음악 맞추기 퀴즈",
  description: "노래를 듣고 원곡을 맞춰보세요! 친구들과 함께 즐기는 음악 퀴즈",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8368501399430510"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${notoSansKR.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}

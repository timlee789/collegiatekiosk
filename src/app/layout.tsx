import type { Metadata } from "next";
import { Nunito } from "next/font/google";
// [수정] 파일 위치에 맞게 경로 변경 (./globals.css -> ../styles/globals.css)
import "../styles/globals.css";
import TestPrinter from "@/components/TestPrinter";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Collegiate Grill Kiosk",
  description: "Touch Kiosk System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.className} antialiased`}>
        {children}
        {/* 👈 2. 여기에 추가 (화면 구석에 뜹니다) */}
      </body>
    </html>
  );
}
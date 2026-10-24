import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import ThemeToggle from "@/components/ThemeToggle";
import FuturisticBackground from "@/components/FuturisticBackground";

export const metadata: Metadata = {
  title: "Melto - Your Personal Cloud Storage",
  description: "Secure, fast, and premium cloud storage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <FuturisticBackground />
          <ThemeToggle />
          <div style={{ position: "relative", zIndex: 1 }}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

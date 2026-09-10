import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { CompanyProvider } from "@/context/CompanyContext";
import { RoleProvider } from "@/context/RoleContext";
import { ClientLayoutWrapper } from "@/components/ClientLayoutWrapper";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "C&R Group Enterprise Portfolio System",
  description: "Enterprise portfolio system for Inversiones ING, C&C, and C&R Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} ${GeistSans.variable} font-sans antialiased bg-muted/20 min-h-screen`} suppressHydrationWarning>
        <CompanyProvider>
          <RoleProvider>
            <ClientLayoutWrapper>
              {children}
            </ClientLayoutWrapper>
          </RoleProvider>
        </CompanyProvider>
      </body>
    </html>
  );
}

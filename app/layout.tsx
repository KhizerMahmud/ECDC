import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECDC Budget Management System",
  description: "Budget management system for tracking contracts, employees, and expenditures",
  icons: {
    icon: '/ecdc-logo.png',
    apple: '/ecdc-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


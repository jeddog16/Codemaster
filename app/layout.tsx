import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Now Buildings Live Sales Wall",
  description: "A Salesforce side dashboard for live Now Buildings sales.",
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

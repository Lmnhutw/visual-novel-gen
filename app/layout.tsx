import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Visual Novel Gen",
  description: "Local-first AI writing workspace for long-form fiction.",
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


import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Inkwell",
  description: "AI storytelling workspace for canon, lore, and generation.",
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

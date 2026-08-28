import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Narrative Studio",
  description: "AI storytelling workspace for canon, lore, and generation.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
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

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Speaker — Interview Practice",
  description: "Voice-based interview and pitch practice with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-900">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dimensional App",
  description: "Built with Next.js and Fastify",
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

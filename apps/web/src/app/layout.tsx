import type { Metadata } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { ImpersonationBanner } from "@/components/impersonation-banner";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dimensional System",
  description: "Dimensional System by Krystal Choo",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${cormorant.variable} ${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          {/* Impersonation banner visible site-wide when testing-as */}
          {/* Client component safely included in server layout */}
          <ImpersonationBanner />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

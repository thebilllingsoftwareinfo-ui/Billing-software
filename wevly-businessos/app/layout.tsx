import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from 'sonner'
import './globals.css'
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: 'Wevly BusinessOS',
    template: '%s — Wevly BusinessOS',
  },
  description:
    'Modern business management for Indian small businesses. Invoicing, inventory, GST, payments and more.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(GeistSans.variable, GeistMono.variable, "font-sans", geist.variable)}
    >
      <body>
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'var(--font-geist-sans)',
              fontSize: '0.875rem',
            },
          }}
        />
      </body>
    </html>
  )
}

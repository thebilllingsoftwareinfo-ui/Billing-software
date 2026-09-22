import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'
import { Lato } from 'next/font/google'
import { cn } from '@/lib/utils'
import { FontSettingsProvider } from '@/components/layout/font-settings-provider'

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'VANIRA — Smart GST Billing & Business Accounting',
    template: '%s — VANIRA',
  },
  description:
    'VANIRA — India\'s #1 Simple Billing, GST, Inventory & Accounting Software for Small & Medium Businesses.',
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
      className={cn(lato.variable, 'font-sans')}
    >
      <body>
        <FontSettingsProvider />
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'var(--app-font-family, var(--font-sans), "Lato", sans-serif)',
              fontSize: '0.875rem',
            },
          }}
        />
      </body>
    </html>
  )
}

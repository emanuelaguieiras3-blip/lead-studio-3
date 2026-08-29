import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Lead Studio — sites criados por IA',
  description: 'Crie landing pages personalizadas para cada perfil, cidade e objetivo com um time de agentes de IA.',
  openGraph: {
    title: 'Lead Studio — sites criados por IA',
    description: 'Sites que nascem do perfil certo.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Lead Studio — Sites que nascem do perfil certo.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lead Studio — sites criados por IA',
    description: 'Sites que nascem do perfil certo.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

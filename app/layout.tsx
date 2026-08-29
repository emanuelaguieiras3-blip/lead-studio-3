import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? productionUrl ?? 'http://localhost:3000'),
  title: 'Lead Studio — oportunidades reais sem site informado',
  description: 'Encontre negócios reais e gere um prompt exclusivo, com dados verificados e gatilhos mentais éticos.',
  openGraph: {
    title: 'Lead Studio — oportunidades reais',
    description: 'Do negócio real a um prompt exclusivo, sem cadastros fictícios.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Lead Studio — encontre oportunidades e crie sites com IA.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lead Studio — oportunidades reais',
    description: 'Do negócio real a um prompt exclusivo, sem cadastros fictícios.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}

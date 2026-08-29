import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Lead Studio — oportunidades sem site',
  description: 'Encontre negócios sem site, priorize avaliações e gere um prompt premium para criar o site com IA.',
  openGraph: {
    title: 'Lead Studio — oportunidades sem site',
    description: 'Do lead certo ao site perfeito com IA.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Lead Studio — encontre oportunidades e crie sites com IA.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lead Studio — oportunidades sem site',
    description: 'Do lead certo ao site perfeito com IA.',
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

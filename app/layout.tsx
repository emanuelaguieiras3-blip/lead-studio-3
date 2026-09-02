import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppShell } from '../components/layout/AppShell';
import { StudioProvider } from '../components/studio-provider';
import { ThemeProvider } from '../components/theme-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? productionUrl ?? 'http://localhost:3000'),
  title: 'Lead Studio — oportunidades reais sem site informado',
  description: 'Encontre negócios reais e gere sites, prompts e propostas com dados públicos verificados.',
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
    <html lang="pt-BR" data-theme="dark" className={inter.variable}>
      <body className="antialiased">
        <ThemeProvider>
          <StudioProvider>
            <AppShell>{children}</AppShell>
          </StudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

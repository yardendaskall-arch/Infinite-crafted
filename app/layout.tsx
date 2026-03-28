import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Infinite Crafted — Neural Edition',
  description: 'Combine elements to discover new ones, powered by a neural network. No API needed.',
  openGraph: {
    title: 'Infinite Crafted',
    description: 'Neural-powered element combination game',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={nunito.className} style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </body>
    </html>
  );
}

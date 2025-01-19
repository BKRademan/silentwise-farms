import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import MainLayout from '@/components/layouts/MainLayout';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Silentwise Farms',
  description: 'Farm Workers Management System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
} 
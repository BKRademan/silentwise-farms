import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import MainLayout from '@/components/layouts/MainLayout';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { DataProvider } from '@/lib/contexts/data-context';

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
        <DataProvider>
          <MainLayout>{children}</MainLayout>
        </DataProvider>
        <Toaster />
      </body>
    </html>
  );
} 
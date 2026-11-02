import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoCare - Vehicle Service Management',
  description: 'Vehicle service and maintenance management: MySQL + Chroma semantic search',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

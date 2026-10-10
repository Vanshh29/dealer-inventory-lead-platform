import type { Metadata } from 'next';
import { SessionProvider } from '@/lib/session';

export const metadata: Metadata = { title: 'Back office', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

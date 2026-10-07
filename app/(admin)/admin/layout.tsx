import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Studio Marmer Admin',
    template: '%s — Studio Marmer Admin',
  },
  description: 'Area internal Studio Marmer.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

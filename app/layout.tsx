import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SyndicPro — Gestion d\'immeuble sans le chaos',
  description: 'Automatisez le recouvrement des charges, le suivi des paiements et la gestion des dépenses avec rappels WhatsApp automatiques.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

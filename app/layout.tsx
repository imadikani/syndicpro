import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: "Orvane — La gestion de copropriété, réinventée.",
  description: 'Automatisez le recouvrement des charges, le suivi des paiements et la gestion des dépenses avec rappels WhatsApp automatiques.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}

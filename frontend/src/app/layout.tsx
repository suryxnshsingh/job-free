import type { Metadata } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: "FreelanceDAO - Decentralized Freelancing Platform",
  description: "The future of freelancing powered by blockchain. Zero fees, instant payments, fair disputes, and true ownership of your work.",
  keywords: ["freelancing", "blockchain", "web3", "decentralized", "ethereum", "smart contracts"],
  authors: [{ name: "FreelanceDAO Team" }],
  openGraph: {
    title: "FreelanceDAO - Decentralized Freelancing Platform",
    description: "The future of freelancing powered by blockchain. Zero fees, instant payments, fair disputes.",
    url: "https://freelancedao.com",
    siteName: "FreelanceDAO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FreelanceDAO - Decentralized Freelancing Platform",
    description: "The future of freelancing powered by blockchain. Zero fees, instant payments, fair disputes.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

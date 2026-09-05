import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../App.css';
import { AgentationToolbar } from '../components/Agentation/AgentationToolbar';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'Drafo — Visual Flowchart & Architecture Diagram Studio',
  description: 'Create stunning, high-precision architecture diagrams, API flowcharts, and technical infographics with Drafo.',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
  openGraph: {
    title: 'Drafo — Visual Flowchart & Architecture Studio',
    description: 'High-precision architecture diagramming & interactive flowchart builder with Next.js.',
    images: ['/logo.svg'],
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Google+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap" />
        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/google-sans" />
      </head>
      <body>
        {children}
        {process.env.NODE_ENV === 'development' && <AgentationToolbar />}
      </body>
    </html>
  );
}

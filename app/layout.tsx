import '#/styles/globals.css';
import { GlobalNav } from '#/ui/global-nav';
import NavMenu from '#/ui/nav/menu';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Jonathan Cheng | Portfolio',
    template: '%s | Portfolio',
  },
  description: 'Personal Website',
  openGraph: {
    title: 'Replace this Title',
    description: 'Replace this description',
    images: [`/api/og?title=Next.js App Router`],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="[color-scheme:dark]">
      <body className="bg-black">
        {/* <GlobalNav /> */}
        <NavMenu />
        <div className="mx-auto overflow-x-clip">{children}</div>
      </body>
    </html>
  );
}

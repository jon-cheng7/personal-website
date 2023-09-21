import '#/styles/globals.css';
import Byline from '#/ui/byline';
import { GlobalNav } from '#/ui/global-nav';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Jonathan Cheng',
    template: '%s | Next.js App Router',
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
    <html lang="en" className="!scroll-smooth [color-scheme:dark]">
      <body className="overflow-y-scroll bg-black pb-36">
        {/*[url('/grid.svg')]*/}
        <GlobalNav />
        <div className="mx-auto space-y-8 overflow-x-hidden pt-[3.5rem] lg:px-8 lg:py-20">
          {children}
          <Byline className="fixed sm:hidden" />
        </div>
      </body>
    </html>
  );
}

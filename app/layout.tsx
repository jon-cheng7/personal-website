import '#/styles/globals.css';
import { GlobalNav } from '#/ui/global-nav';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Jonathan Cheng',
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
        {/*[url('/grid.svg')]*/}
        <GlobalNav />
        <div className="mx-auto space-y-8 overflow-x-clip pt-[3.5rem]">
          {children}
          {/* <Byline className="fixed sm:hidden" /> */}
        </div>
      </body>
    </html>
  );
}

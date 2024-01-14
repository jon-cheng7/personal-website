import React from 'react';

const title = 'Art';

export const metadata = {
  title,
  openGraph: {
    title,
    images: [`/api/og?title=${title}`],
  },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="overflow-hidden">{children}</div>;
}

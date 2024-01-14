import React from 'react';

const title = 'About Me';

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
  return (
    <div className="[overflow:overlay]">
      <div>{children}</div>
    </div>
  );
}

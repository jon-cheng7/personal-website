const title = 'Experience';

export const metadata = {
  title,
  openGraph: {
    title,
    images: [`/api/og?title=${title}`],
  },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
  audience: React.ReactNode;
  views: React.ReactNode;
}) {
  return (
    <div className="">
      <div className="">{children}</div>
    </div>
  );
}

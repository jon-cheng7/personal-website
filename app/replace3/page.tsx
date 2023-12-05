'use client';
import FloatingBalls from '#/ui/floatingBalls';

const items = [
  {
    name: 'replace3',
    slug: 'replace3',
    description: 'filler',
  },
];

export default function Page() {
  return (
    <>
      <div className="h-screen">
        <FloatingBalls />
      </div>
      <div className="h-screen"></div>
    </>
  );
}

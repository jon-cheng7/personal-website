'use client';
import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the mobile and desktop components
const MobileComponents = dynamic(() => import('#/ui/mobile'));
const DesktopComponents = dynamic(() => import('#/ui/desktop'));

function Page() {
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  // Determine device type upon component mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth <= 800);
    }
  }, []);

  if (isMobile === null) return null;

  return <div>{isMobile ? <MobileComponents /> : <DesktopComponents />}</div>;
}

export default Page;

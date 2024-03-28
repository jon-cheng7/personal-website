'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const MobileComponent = dynamic(() => import('#/ui/mobile/me_mobile'));
const DesktopComponent = dynamic(() => import('#/ui/desktop/me_desktop'));

export default function Page() {
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  // Determine device type upon component mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth <= 800);
    }
  }, []);

  if (isMobile === null) return null;

  return <div>{isMobile ? <MobileComponent /> : <DesktopComponent />}</div>;
}

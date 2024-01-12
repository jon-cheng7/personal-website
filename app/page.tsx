'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import IncompleteModal from '#/ui/modal';

// Dynamically import the mobile and desktop components
const MobileComponents = dynamic(() => import('#/ui/mobile'));
const DesktopComponents = dynamic(() => import('#/ui/desktop'));

function Page() {
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Determine device type upon component mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth <= 800);
    }
  }, []);

  useEffect(() => {
    // Show the modal upon entering the site
    setShowModal(true);
  }, []);

  if (isMobile === null) return null;

  return (
    <div>
      {showModal && <IncompleteModal onClose={() => setShowModal(false)} />}
      {isMobile ? <MobileComponents /> : <DesktopComponents />}
    </div>
  );
}

export default Page;

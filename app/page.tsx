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
    // Check if the modal has already been shown in this session
    const hasModalBeenShown = sessionStorage.getItem('hasModalBeenShown');

    if (!hasModalBeenShown) {
      // Show the modal if it hasn't been shown yet
      setShowModal(true);
      // Mark the modal as shown in sessionStorage
      sessionStorage.setItem('hasModalBeenShown', 'true');
    }
  }, []);

  if (isMobile === null) return null;

  return (
    <div className="pt-[3.5rem]">
      {showModal && <IncompleteModal onClose={() => setShowModal(false)} />}
      {isMobile ? <MobileComponents /> : <DesktopComponents />}
    </div>
  );
}

export default Page;

// components/IncompleteModal.tsx

import React from 'react';

const IncompleteModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <>
      <div className="fixed inset-0 z-[899] bg-black bg-opacity-70"> </div>
      <div className="round fixed left-[50%] top-[50%] z-[900] -translate-x-[50%] rounded-lg bg-[#4e4e4e] px-8 py-4 shadow-md">
        <div className="text-center text-sm text-white">
          This site is still in construction, some features are missing or
          incomplete. Not yet compatible with some browsers.
        </div>
        <button
          className="mt-2 text-blue-500 hover:text-blue-700"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </>
  );
};

export default IncompleteModal;

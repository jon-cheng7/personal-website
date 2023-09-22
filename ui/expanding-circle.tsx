import React, { useEffect, useState } from 'react';

type ExpandingProps = {
  className?: string;
  offset?: number; // In pixels
};

const ExpandingCircle: React.FC<ExpandingProps> = ({
  className,
  offset = 0,
}) => {
  const [scrolledValue, setScrolledValue] = useState(0);

  const calculateScrolledValue = () => {
    const currentScroll = document.documentElement.scrollTop;

    if (currentScroll < offset) {
      setScrolledValue(0);
      return;
    }

    setScrolledValue(currentScroll - offset);
  };

  useEffect(() => {
    window.addEventListener('scroll', calculateScrolledValue);

    return () => {
      window.removeEventListener('scroll', calculateScrolledValue);
    };
  }, []);

  const circleSize =
    scrolledValue * 2 < 315 ? `${scrolledValue * 2}vw` : '315vw';

  return (
    <div
      className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-[#B7B0A4] ${className}`}
      style={{ width: 500, height: circleSize }}
    ></div>
  );
};

export default ExpandingCircle;

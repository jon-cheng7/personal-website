import React from 'react';

type squareinfoboxprops = {
  size: number; // Size of the square
  redirectTo?: string; // URL to redirect on click
  className?: string;
};

const SquareInfoBox: React.FC<squareinfoboxprops> = ({
  size,
  redirectTo,
  className,
}) => {
  const handleClick = () => {
    if (redirectTo) {
      window.location.href = redirectTo; // Redirects to the given URL
    }
  };

  const squareStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '15%', // Adjust for roundness
    cursor: 'url(cursorImageUrl), auto', // Custom cursor image URL
  };

  return (
    <div style={squareStyle} className={className} onClick={handleClick}>
      {/* Optionally, add a "learn more" tooltip here */}
    </div>
  );
};

export default SquareInfoBox;

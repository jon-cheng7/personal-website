import React from 'react';

type LogoProps = {
  logos: string[];
  className?: string;
};

const LogoSlide: React.FC<LogoProps> = ({ logos, className }) => {
  return (
    <div className={`h-[100%] w-[100%] overflow-hidden ${className}`}>
      <div className="animate-slide relative flex gap-[3%]">
        {logos.map((logoSrc, idx) => (
          <img src={logoSrc} alt={`logo-item-${idx}`} className="block" />
        ))}
        {logos.map((logoSrc, idx) => (
          <img src={logoSrc} alt={`logo-item-${idx}`} className="block" />
        ))}
      </div>
    </div>
  );
};

export default LogoSlide;

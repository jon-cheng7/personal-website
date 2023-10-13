import React, { useState } from 'react';
import { useTrail, a } from '@react-spring/web';

type TrailProps = {
  open: boolean;
  children: React.ReactNode;
};

const Trail: React.FC<TrailProps> = ({ open, children }) => {
  const items = React.Children.toArray(children);
  const trail = useTrail(items.length, {
    config: { mass: 5, tension: 2000, friction: 200 },
    opacity: open ? 1 : 0,
    x: open ? 0 : 20,
    height: open ? 110 : 0,
    from: { opacity: 0, x: 20, height: 0 },
  });
  return (
    <div>
      {trail.map(({ height, ...style }, index) => (
        <a.div
          key={index}
          className="relative h-[60px] w-[100%] overflow-hidden text-[4em] font-black leading-[35px] tracking-[-0.05em] text-black will-change-auto"
          style={style}
        >
          <a.div style={{ height }}>{items[index]}</a.div>
        </a.div>
      ))}
    </div>
  );
};

export default Trail;

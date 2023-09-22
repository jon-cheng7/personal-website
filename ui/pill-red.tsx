import React, { ForwardRefRenderFunction } from 'react';

type PillRedProps = {
  className?: string; // optional className prop
  strokeDashoffset?: number;
};

export function PillRed(props: PillRedProps) {
  return (
    <svg
      width="150"
      height="597"
      viewBox="0 0 150 597"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M75 75L75 522"
        stroke="#ED5151"
        strokeWidth="150"
        strokeLinecap="round"
        strokeDasharray="100 10000"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

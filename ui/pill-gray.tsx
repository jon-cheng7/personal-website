import { propagateServerField } from 'next/dist/server/lib/render-server';

type PillGrayProps = {
  className?: string; // optional className prop
  strokeDashoffset?: number;
  strokeWidth?: number;
};

export function PillGray(props: PillGrayProps) {
  return (
    <svg
      width="1000"
      height="992"
      viewBox="0 0 312 992"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M63 63L63 344C63 488.5 249 468.5 249 608C249 754 249 882.833 249 929"
        stroke="#B7B0A4"
        strokeWidth={props.strokeWidth}
        stroke-linecap="round"
        stroke-dasharray="100 10000"
        stroke-dashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

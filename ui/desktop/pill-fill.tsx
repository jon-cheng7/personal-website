type PillFillProps = {
  className?: string;
  strokeDashoffset?: number;
  strokeWidth: number;
};

export function PillFill(props: PillFillProps) {
  return (
    <svg
      width="3639"
      height="1500"
      viewBox="0 0 3639 1500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M3388.11 250.176C2827.45 669.598 1529.5 1197.5 251 1010.5"
        stroke="#B7B0A4"
        strokeWidth={`calc(400 + ${props.strokeWidth})`}
        strokeDasharray="800 100000"
        stroke-linecap="round"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

// strokeWidth={`calc(400 + ${props.strokeWidth})`}

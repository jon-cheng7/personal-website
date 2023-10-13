type PillWhiteProps = {
  className?: string;
  strokeDashoffset?: number;
};

export function PillWhite2(props: PillWhiteProps) {
  return (
    <svg
      width="3298"
      height="100"
      viewBox="0 0 3298 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M50 50L3248 50.0003"
        stroke="white"
        strokeWidth="100"
        strokeLinecap="round"
        strokeDasharray="500 10000"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

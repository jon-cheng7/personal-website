type PillBlueProps = {
  className?: string; // optional className prop
  strokeDashoffset?: number;
};

export function PillBlue(props: PillBlueProps) {
  return (
    <svg
      width="411"
      height="1058"
      viewBox="0 0 411 1058"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M360.5 50.5V223.081C360.499 320.627 300.5 342 220 373.668C139.5 405.336 50 405.5 50 547.283C50 743.389 50.9531 935.8 50 1007.5"
        stroke="#4C4F6C"
        stroke-width="100"
        stroke-linecap="round"
        stroke-dasharray="100 10000"
        stroke-dashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

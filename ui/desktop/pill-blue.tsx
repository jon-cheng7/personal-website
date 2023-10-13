type PillBlueProps = {
  className?: string;
  strokeDashoffset?: number;
};

export function PillBlue(props: PillBlueProps) {
  return (
    <svg
      width="1000"
      height="1909"
      viewBox="0 0 300 1909"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M150 150V1759"
        stroke="#4C4F6C"
        strokeWidth="400"
        strokeLinecap="round"
        strokeDasharray="400 10000"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

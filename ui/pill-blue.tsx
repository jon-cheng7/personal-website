type PillBlueProps = {
  className?: string; // optional className prop
  strokeDashoffset?: number;
};

export function PillBlue(props: PillBlueProps) {
  return (
    <svg
      width="100"
      height="227"
      viewBox="0 0 100 227"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M50 50L50 177"
        stroke="#4C4F6C"
        stroke-width="100"
        stroke-linecap="round"
        strokeDasharray="500 10000"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

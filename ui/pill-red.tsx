type PillRedProps = {
  className?: string; // optional className prop
  strokeDashoffset?: number;
};

export function PillRed(props: PillRedProps) {
  return (
    <svg
      width="150"
      height="248"
      viewBox="0 0 150 248"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M75 75L75 173"
        stroke="#ED5151"
        stroke-width="150"
        stroke-linecap="round"
        stroke-dasharray="2 10000"
        stroke-dashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

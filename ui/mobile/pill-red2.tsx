type PillRed2Props = {
  className?: string;
  strokeDashoffset?: number;
};

export function PillRed2(props: PillRed2Props) {
  return (
    <svg
      width="846"
      height="517"
      viewBox="0 0 846 517"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M780.315 65.2049L65.471 451.337"
        stroke="#ED5151"
        strokeWidth="130"
        strokeLinecap="round"
        strokeDasharray="1000 10000"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

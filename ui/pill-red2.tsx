type PillRed2Props = {
  className?: string;
  strokeDashoffset?: number;
};

export function PillRed2(props: PillRed2Props) {
  return (
    <svg
      width="296"
      height="700"
      viewBox="0 0 276 680"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M225 50V185C225 185 229.5 256 191 294.5C152.5 333 136.5 325.5 95.4981 350C54.4962 374.5 50.9971 430.268 50.9971 430.268V630"
        stroke="#ED5151"
        strokeWidth="100"
        strokeLinecap="round"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

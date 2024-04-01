type PillAccentProps = {
  className?: string;
  strokeDashoffset?: number;
};

export function PillAccent(props: PillAccentProps) {
  return (
    <svg
      width="3116"
      height="500"
      viewBox="0 0 3116 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M250 250H2865.5"
        stroke="#c5fb45"
        strokeWidth="200"
        strokeLinecap="round"
        strokeDasharray="250 10000"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

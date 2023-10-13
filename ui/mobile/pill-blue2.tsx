type PillBlue2Props = {
  className?: string;
  strokeDashoffset?: number;
};

export function PillBlue2(props: PillBlue2Props) {
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
        d="M780.39 65.4726L65.5452 451.605"
        stroke="#4C4F6C"
        strokeWidth="130"
        strokeLinecap="round"
        strokeDasharray="1000 10000"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

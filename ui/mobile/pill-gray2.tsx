type PillGray2Props = {
  className?: string;
  strokeDashoffset?: number;
};

export function PillGray2(props: PillGray2Props) {
  return (
    <svg
      width="845"
      height="518"
      viewBox="0 0 845 518"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M779.955 65.8953L65.1106 452.027"
        stroke="#B7B0A4"
        strokeWidth="130"
        strokeLinecap="round"
        strokeDasharray="1000 10000"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

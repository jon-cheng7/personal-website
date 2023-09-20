type PillGrayProps = {
  className?: string; // optional className prop
  strokeDashoffset?: number;
};

export function PillGray(props: PillGrayProps) {
  return (
    <svg
      width="126"
      height="208"
      viewBox="0 0 126 208"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M63 63L63 145"
        stroke="#B7B0A4"
        stroke-width="125"
        stroke-linecap="round"
        stroke-dasharray="500 10000"
        stroke-dashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

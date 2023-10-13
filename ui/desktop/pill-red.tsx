type PillRedProps = {
  className?: string;
  strokeDashoffset?: number;
  strokeWidth: number;
};

export function PillRed(props: PillRedProps) {
  return (
    // <svg width="2945" height="3992" viewBox="0 0 2945 3992" fill="none" xmlns="http://www.w3.org/2000/svg" className={props.className}>
    // <path d="M2147 250V460V565V670V775C2147 1099.5 1822.34 1235.5 1547 1300C1271.66 1364.5 1088.5 1459.5 1123 2092.5C1123 2092.5 1123 2305 1123 2434C1123 2653.5 1292 2783.5 1420 2805C1742.32 2859.14 1881.94 2529.5 1927.34 2417.5C2070.83 2063.5 2532 2092.5 2637.5 2417.5C2776.5 2912 2750.3 3866.5 1533.5 3728.5C316.7 3590.5 185.167 2554.67 271.5 2054" stroke="#B7B0A4" strokeWidth={`calc(500 + ${props.strokeWidth})`} strokeDasharray="500 10000" stroke-linecap="round" strokeDashoffset={props.strokeDashoffset}/>
    // </svg>

    <svg
      width="3105"
      height="5947"
      viewBox="0 0 3105 5947"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M2146.72 250V460V565V670V775C2146.72 1099.5 1822.06 1235.5 1546.72 1300C1271.38 1364.5 1088.22 1459.5 1122.72 2092.5C1122.72 2092.5 1122.72 2305 1122.72 2434C1122.72 2653.5 1291.72 2783.5 1419.72 2805C1742.04 2859.14 1881.67 2529.5 1927.06 2417.5C2070.55 2063.5 2531.72 2092.5 2637.22 2417.5C2776.22 2912 2750.02 3866.5 1533.22 3728.5C316.421 3590.5 184.888 2554.67 271.221 2054V5697H2854.5"
        stroke="#B7B0A4"
        strokeWidth={`calc(500 + ${props.strokeWidth})`}
        strokeDasharray="500 100000"
        stroke-linecap="round"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>
  );
}

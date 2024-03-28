type PillRedProps = {
  className?: string;
  strokeDashoffset?: number;
};

export function PillRed(props: PillRedProps) {
  return (
    <svg
      width="4539"
      height="2672"
      viewBox="0 0 4539 2672"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        d="M1268.71 250.5V671V776V881V986C1268.71 1310.5 944.056 1446.5 668.714 1511C393.371 1575.5 250.221 1723.5 250.222 1901.5C250.222 1901.5 250.222 1915 250.222 2044C250.222 2263.5 419.222 2393.5 547.222 2415C869.541 2469.14 1009.17 2139.5 1054.56 2027.5C1198.05 1673.5 1606.5 1511.16 1889.5 1593C2268.13 1702.5 3653 2126 4288.5 2264"
        stroke="#B7B0A4"
        strokeWidth={`500`}
        strokeDasharray="500 100000"
        stroke-linecap="round"
        strokeDashoffset={props.strokeDashoffset}
      />
    </svg>

    // <svg
    //   width="3105"
    //   height="5947"
    //   viewBox="0 0 3105 5947"
    //   fill="none"
    //   xmlns="http://www.w3.org/2000/svg"
    //   className={props.className}
    // >
    //   <path
    //     d="M2146.72 250V460V565V670V775C2146.72 1099.5 1822.06 1235.5 1546.72 1300C1271.38 1364.5 1088.22 1459.5 1122.72 2092.5C1122.72 2092.5 1122.72 2305 1122.72 2434C1122.72 2653.5 1291.72 2783.5 1419.72 2805C1742.04 2859.14 1881.67 2529.5 1927.06 2417.5C2070.55 2063.5 2531.72 2092.5 2637.22 2417.5C2776.22 2912 2750.02 3866.5 1533.22 3728.5C316.421 3590.5 184.888 2554.67 271.221 2054V5697H2854.5"
    //     stroke="#B7B0A4"
    //     strokeWidth={`calc(500 + ${props.strokeWidth})`}
    //     strokeDasharray="500 100000"
    //     stroke-linecap="round"
    //     strokeDashoffset={props.strokeDashoffset}
    //   />
    // </svg>
  );
}

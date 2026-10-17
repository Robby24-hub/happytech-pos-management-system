import "./Chart.css";
import { money } from "../../data/mock";
export default function Chart({ values, labels, max = 20000 }) {
  const W = 850,
    H = 310,
    left = 46,
    bottom = 275,
    plotH = 250;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Sales bar chart"
      className="sales-chart"
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const y = bottom - (i * plotH) / 4;
        return (
          <g key={i}>
            <line x1={left} y1={y} x2={W - 8} y2={y} stroke="#dbe6e1" />
            <text
              x={left - 9}
              y={y + 4}
              textAnchor="end"
              fill="#667873"
              fontSize="11"
            >
              {i === 0 ? "0" : `${(max * i) / 4 / 1000}k`}
            </text>
          </g>
        );
      })}
      {values.map((n, i) => {
        const step = (W - left - 15) / values.length;
        return (
          <g key={i}>
            <title>
              {labels[i]}: {money(n)}
            </title>
            <rect
              x={left + i * step + step * 0.22}
              y={bottom - (n / max) * plotH}
              width={step * 0.46}
              height={(n / max) * plotH}
              rx="4"
              fill={i === values.length - 1 ? "#34cf88" : "#2f9b6b"}
            />
            <text
              x={left + i * step + step * 0.45}
              y={bottom + 23}
              textAnchor="middle"
              fontSize="10"
              fill="#37443e"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

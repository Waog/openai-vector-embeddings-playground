import type { ReactNode } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { projectTo2D } from "../lib/pca";

interface ScatterPlotProps {
  inputs: string[];
  embeddings: number[][];
  focusedIndex: number | null;
}

const MAX_SHORT_LABEL_LENGTH = 14;
const COLOR_PALETTE = [
  "#0d9488",
  "#2563eb",
  "#b45309",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#65a30d",
  "#db2777",
];
const MARKERS = [
  "circle",
  "square",
  "diamond",
  "triangle",
  "cross",
  "plus",
] as const;

type MarkerKind = (typeof MARKERS)[number];

interface ScatterPointData {
  x: number;
  y: number;
  label: string;
  fullText: string;
  color: string;
  marker: MarkerKind;
  isFocused: boolean;
}

interface MarkerShapeProps {
  cx?: number;
  cy?: number;
  payload?: ScatterPointData;
}

function shortLabel(text: string): string {
  return text.length > MAX_SHORT_LABEL_LENGTH
    ? `${text.slice(0, MAX_SHORT_LABEL_LENGTH - 1)}…`
    : text;
}

interface TooltipPayloadItem {
  payload: ScatterPointData;
}

function ScatterTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="scatter-tooltip">
      <div>{point.fullText}</div>
      <div className="hint-text">
        PC1: {point.x.toFixed(3)}, PC2: {point.y.toFixed(3)}
      </div>
    </div>
  );
}

function drawMarker(kind: MarkerKind, size: number): ReactNode {
  const half = size / 2;
  switch (kind) {
    case "square":
      return <rect x={-half} y={-half} width={size} height={size} />;
    case "diamond":
      return <path d={`M 0 ${-half} L ${half} 0 L 0 ${half} L ${-half} 0 Z`} />;
    case "triangle":
      return <path d={`M 0 ${-half} L ${half} ${half} L ${-half} ${half} Z`} />;
    case "cross":
      return (
        <g>
          <line
            x1={-half}
            y1={-half}
            x2={half}
            y2={half}
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1={half}
            y1={-half}
            x2={-half}
            y2={half}
            stroke="currentColor"
            strokeWidth="2"
          />
        </g>
      );
    case "plus":
      return (
        <g>
          <line
            x1={-half}
            y1={0}
            x2={half}
            y2={0}
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1={0}
            y1={-half}
            x2={0}
            y2={half}
            stroke="currentColor"
            strokeWidth="2"
          />
        </g>
      );
    case "circle":
    default:
      return <circle cx={0} cy={0} r={half} />;
  }
}

function MarkerShape({ cx, cy, payload }: MarkerShapeProps) {
  if (cx === undefined || cy === undefined || !payload) return null;

  const markerSize = payload.isFocused ? 11 : 8;
  const marker = drawMarker(payload.marker, markerSize);

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {payload.isFocused && (
        <circle
          cx={0}
          cy={0}
          r={8.5}
          fill="none"
          stroke={payload.color}
          strokeWidth={2}
          opacity={0.95}
        />
      )}
      <g fill={payload.color} stroke={payload.color} color={payload.color}>
        {marker}
      </g>
    </g>
  );
}

/**
 * 2D scatter plot of embeddings, projected with PCA. This view is only an
 * approximation of the true high-dimensional relationships — see the
 * disclaimer rendered below the chart.
 */
export function ScatterPlot({
  inputs,
  embeddings,
  focusedIndex,
}: ScatterPlotProps) {
  if (inputs.length < 2) {
    return (
      <p className="hint-text">
        Enable at least 2 known embeddings to see a 2D scatter plot.
      </p>
    );
  }

  const points = projectTo2D(embeddings);
  const hasFocused = focusedIndex !== null;
  const data: ScatterPointData[] = points.map((point, i) => ({
    x: point.x,
    y: point.y,
    label: shortLabel(inputs[i]),
    fullText: inputs[i],
    color: COLOR_PALETTE[i % COLOR_PALETTE.length],
    marker: MARKERS[i % MARKERS.length],
    isFocused: focusedIndex === i,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="PC1"
            label={{ value: "PC1", position: "insideBottom", offset: -10 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="PC2"
            label={{ value: "PC2", angle: -90, position: "insideLeft" }}
          />
          <Tooltip content={<ScatterTooltip />} />
          {data.map((point) => (
            <Scatter
              key={point.fullText}
              data={[point]}
              fill={point.color}
              shape={<MarkerShape />}
              opacity={hasFocused && !point.isFocused ? 0.32 : 1}
              isAnimationActive={false}
              name={point.fullText}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <ul className="scatter-legend" aria-label="Scatter legend">
        {data.map((point, i) => (
          <li
            key={i}
            className={`scatter-legend-item${point.isFocused ? " is-focused" : ""}`}
            title={point.fullText}
          >
            <svg
              className="scatter-legend-marker"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              {point.isFocused && (
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  fill="none"
                  stroke={point.color}
                  strokeWidth="1.8"
                />
              )}
              <g
                transform="translate(10 10)"
                fill={point.color}
                stroke={point.color}
                color={point.color}
              >
                {drawMarker(point.marker, point.isFocused ? 8 : 7)}
              </g>
            </svg>
            <span>{point.label}</span>
          </li>
        ))}
      </ul>
      <p className="warning-text">
        This 2D projection (PCA) is an approximation for visualization only.
        Distances between points here do not exactly match cosine similarity in
        the original high-dimensional embedding space — always refer to the
        similarity matrix or ranked list above for accurate similarity values.
      </p>
    </div>
  );
}

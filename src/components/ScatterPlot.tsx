import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { projectTo2D } from "../lib/pca";

interface ScatterPlotProps {
  inputs: string[];
  embeddings: number[][];
}

const MAX_SHORT_LABEL_LENGTH = 14;

function shortLabel(text: string): string {
  return text.length > MAX_SHORT_LABEL_LENGTH
    ? `${text.slice(0, MAX_SHORT_LABEL_LENGTH - 1)}…`
    : text;
}

interface TooltipPayloadItem {
  payload: { fullText: string; x: number; y: number };
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

/**
 * 2D scatter plot of embeddings, projected with PCA. This view is only an
 * approximation of the true high-dimensional relationships — see the
 * disclaimer rendered below the chart.
 */
export function ScatterPlot({ inputs, embeddings }: ScatterPlotProps) {
  if (inputs.length < 2) {
    return (
      <p className="hint-text">
        Fetch at least 2 embeddings to see a 2D scatter plot.
      </p>
    );
  }

  const points = projectTo2D(embeddings);
  const data = points.map((point, i) => ({
    x: point.x,
    y: point.y,
    label: shortLabel(inputs[i]),
    fullText: inputs[i],
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
          <ZAxis range={[80, 80]} />
          <Tooltip content={<ScatterTooltip />} />
          <Scatter data={data} fill="var(--accent)" />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="scatter-labels">
        {data.map((point, i) => (
          <span key={i} className="scatter-label-chip" title={point.fullText}>
            {point.label}
          </span>
        ))}
      </div>
      <p className="warning-text">
        This 2D projection (PCA) is an approximation for visualization only.
        Distances between points here do not exactly match cosine similarity in
        the original high-dimensional embedding space — always refer to the
        similarity matrix or ranked list above for accurate similarity values.
      </p>
    </div>
  );
}

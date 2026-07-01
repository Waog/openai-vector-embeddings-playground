interface SimilarityMatrixProps {
  inputs: string[];
  matrix: number[][];
  focusedIndex: number | null;
}

const MAX_LABEL_LENGTH = 16;

function truncate(text: string): string {
  return text.length > MAX_LABEL_LENGTH
    ? `${text.slice(0, MAX_LABEL_LENGTH - 1)}…`
    : text;
}

/**
 * Full pairwise cosine similarity matrix. Always computed from the original
 * high-dimensional embeddings (never from the 2D PCA projection).
 */
export function SimilarityMatrix({
  inputs,
  matrix,
  focusedIndex,
}: SimilarityMatrixProps) {
  if (inputs.length < 2) {
    return (
      <p className="hint-text">
        Enable at least 2 known embeddings to see a similarity matrix.
      </p>
    );
  }

  return (
    <div className="table-scroll">
      <table className="similarity-table">
        <thead>
          <tr>
            <th />
            {inputs.map((input, i) => (
              <th
                key={i}
                title={input}
                className={focusedIndex === i ? "focused-axis-cell" : undefined}
              >
                {truncate(input)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inputs.map((rowInput, i) => (
            <tr key={i}>
              <th
                title={rowInput}
                className={focusedIndex === i ? "focused-axis-cell" : undefined}
              >
                {truncate(rowInput)}
              </th>
              {inputs.map((_, j) => {
                const value = matrix[i][j];
                const isDiagonal = i === j;
                const isFocusedCross =
                  focusedIndex !== null &&
                  (focusedIndex === i || focusedIndex === j);
                const className = [
                  isDiagonal ? "diagonal-cell" : "",
                  isFocusedCross ? "focused-cross-cell" : "",
                  focusedIndex !== null &&
                  focusedIndex === i &&
                  focusedIndex === j
                    ? "focused-cross-origin"
                    : "",
                ]
                  .filter((entry) => entry.length > 0)
                  .join(" ");
                return (
                  <td
                    key={j}
                    className={className || undefined}
                    title={`${inputs[i]} ↔ ${inputs[j]}`}
                  >
                    {value.toFixed(3)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

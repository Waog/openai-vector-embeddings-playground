import { rankBySimilarity } from "../lib/similarity";

interface RankingListProps {
  inputs: string[];
  embeddings: number[][];
  selectedIndex: number | null;
  onSelectedIndexChange: (index: number | null) => void;
}

const TOP_MATCH_COUNT = 3;

/** Lets the user pick one input as a query and ranks all others by similarity. */
export function RankingList({
  inputs,
  embeddings,
  selectedIndex,
  onSelectedIndexChange,
}: RankingListProps) {
  if (inputs.length < 2) {
    return (
      <p className="hint-text">
        Fetch at least 2 embeddings to rank similarities.
      </p>
    );
  }

  const ranked =
    selectedIndex !== null
      ? rankBySimilarity(selectedIndex, inputs, embeddings)
      : [];

  return (
    <div>
      <label className="field-label" htmlFor="query-select">
        Query input
      </label>
      <select
        id="query-select"
        value={selectedIndex ?? ""}
        onChange={(e) =>
          onSelectedIndexChange(
            e.target.value === "" ? null : Number(e.target.value),
          )
        }
      >
        <option value="">Select an input…</option>
        {inputs.map((input, i) => (
          <option key={i} value={i}>
            {input}
          </option>
        ))}
      </select>

      {selectedIndex !== null && (
        <ol className="ranking-list">
          {ranked.map((match, position) => (
            <li
              key={match.index}
              className={position < TOP_MATCH_COUNT ? "top-match" : undefined}
              title={match.input}
            >
              <span className="rank-similarity">
                {match.similarity.toFixed(3)}
              </span>
              <span className="rank-input">{match.input}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

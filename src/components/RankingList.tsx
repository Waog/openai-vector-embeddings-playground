import { rankBySimilarity } from "../lib/similarity";

interface RankingListProps {
  inputs: string[];
  embeddings: number[][];
  focusedIndex: number | null;
}

const TOP_MATCH_COUNT = 3;

/** Lets the user pick one input as a query and ranks all others by similarity. */
export function RankingList({
  inputs,
  embeddings,
  focusedIndex,
}: RankingListProps) {
  if (inputs.length < 2) {
    return (
      <p className="hint-text">
        Enable at least 2 known embeddings to rank similarities.
      </p>
    );
  }

  const ranked =
    focusedIndex !== null
      ? rankBySimilarity(focusedIndex, inputs, embeddings)
      : [];

  return (
    <div>
      {focusedIndex === null ? (
        <p className="hint-text">
          Focus an entry with the eye button in Known embeddings to rank
          similarities.
        </p>
      ) : (
        <>
          <p className="field-label">Query input</p>
          <p className="ranked-query-name" title={inputs[focusedIndex]}>
            {inputs[focusedIndex]}
          </p>

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
        </>
      )}
    </div>
  );
}

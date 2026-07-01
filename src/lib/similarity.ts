// Cosine similarity utilities. Always operate on the original
// high-dimensional embeddings, never on any 2D projection.

import type { RankedMatch } from "../types";

/** Euclidean norm (magnitude) of a vector. */
function norm(vector: number[]): number {
  let sumOfSquares = 0;
  for (const value of vector) {
    sumOfSquares += value * value;
  }
  return Math.sqrt(sumOfSquares);
}

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Cosine similarity between two vectors: dot(a, b) / (||a|| * ||b||).
 *
 * OpenAI embeddings are typically already unit-normalized, but we compute
 * norms defensively rather than assuming that, so this function is correct
 * even for non-normalized vectors (e.g. imported from elsewhere).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const normA = norm(a);
  const normB = norm(b);
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot(a, b) / (normA * normB);
}

/** Full pairwise cosine similarity matrix for a list of embeddings. */
export function buildSimilarityMatrix(embeddings: number[][]): number[][] {
  const n = embeddings.length;
  const matrix: number[][] = Array.from({ length: n }, () =>
    new Array<number>(n).fill(0),
  );
  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < n; j++) {
      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
      matrix[i][j] = similarity;
      matrix[j][i] = similarity;
    }
  }
  return matrix;
}

/**
 * Rank every other input by cosine similarity to the input at `queryIndex`,
 * descending (most similar first). The query itself is excluded.
 */
export function rankBySimilarity(
  queryIndex: number,
  inputs: string[],
  embeddings: number[][],
): RankedMatch[] {
  const query = embeddings[queryIndex];
  const matches: RankedMatch[] = [];
  for (let i = 0; i < embeddings.length; i++) {
    if (i === queryIndex) continue;
    matches.push({
      index: i,
      input: inputs[i],
      similarity: cosineSimilarity(query, embeddings[i]),
    });
  }
  matches.sort((a, b) => b.similarity - a.similarity);
  return matches;
}

// Shared types for the embeddings playground.

/** OpenAI embedding models supported by the UI. */
export type EmbeddingModel =
  | "text-embedding-3-small"
  | "text-embedding-3-large";

/** A single input's embedding result, tied to the exact input text. */
export interface EmbeddingRecord {
  /** The original (trimmed) input text this embedding was computed for. */
  input: string;
  /** Model used to compute the embedding. */
  model: EmbeddingModel;
  /** Optional reduced dimensionality requested from the API, if any. */
  dimensions?: number;
  /** The raw embedding vector returned by OpenAI. */
  embedding: number[];
  /** Where this record's embedding came from: cache, a fresh API call, or an imported file. */
  source: "cache" | "api" | "import";
}

/** Shape of the JSON produced by "Export JSON" / accepted by "Import JSON". */
export interface ExperimentExport {
  model: EmbeddingModel;
  dimensions?: number;
  inputs: string[];
  embeddings: number[][];
  /** Full pairwise cosine similarity matrix, same order as `inputs`. */
  similarities: number[][];
}

/** A ranked similarity result for the "selected query" ranking view. */
export interface RankedMatch {
  index: number;
  input: string;
  similarity: number;
}

// Thin wrapper around the OpenAI REST embeddings endpoint using `fetch`.
//
// We deliberately use `fetch` directly instead of the official OpenAI SDK:
// the SDK requires an explicit `dangerouslyAllowBrowser: true` flag to run
// in a browser at all, precisely because calling OpenAI from client-side
// code exposes the API key to anyone who can inspect network traffic or the
// page. A plain `fetch` call is simpler, has zero extra dependencies, and
// makes the security tradeoff fully transparent in this one file.

import type { EmbeddingModel } from "../types";

const EMBEDDINGS_ENDPOINT = "https://api.openai.com/v1/embeddings";

export interface FetchEmbeddingsParams {
  apiKey: string;
  inputs: string[];
  model: EmbeddingModel;
  dimensions?: number;
}

export interface FetchEmbeddingsResult {
  /** Embeddings in the same order as the `inputs` that were requested. */
  embeddings: number[][];
}

/** Error thrown for any non-2xx response from the OpenAI API. */
export class OpenAIRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "OpenAIRequestError";
    this.status = status;
  }
}

/**
 * Fetch embeddings for a batch of inputs in a single request.
 *
 * OpenAI's embeddings endpoint accepts `input` as an array of strings and
 * returns one embedding per input, in the same order as sent (each item in
 * the response `data` array also carries an `index` field, which we use to
 * make the input/output mapping explicit rather than assuming order).
 */
export async function fetchEmbeddings({
  apiKey,
  inputs,
  model,
  dimensions,
}: FetchEmbeddingsParams): Promise<FetchEmbeddingsResult> {
  if (inputs.length === 0) {
    return { embeddings: [] };
  }

  const body: Record<string, unknown> = { input: inputs, model };
  if (dimensions) {
    body.dimensions = dimensions;
  }

  let response: Response;
  try {
    response = await fetch(EMBEDDINGS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new OpenAIRequestError(
      "Network error while contacting the OpenAI API. Check your internet connection.",
    );
  }

  if (!response.ok) {
    let message = `OpenAI API request failed with status ${response.status}.`;
    try {
      const errorBody = (await response.json()) as {
        error?: { message?: string };
      };
      if (errorBody?.error?.message) {
        message = errorBody.error.message;
      }
    } catch {
      // Response body wasn't valid JSON; fall back to the generic message above.
    }
    throw new OpenAIRequestError(message, response.status);
  }

  const json = (await response.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };

  // Re-order defensively by the `index` field the API returns, rather than
  // assuming the response preserves request order.
  const embeddings = new Array<number[]>(inputs.length);
  for (const item of json.data) {
    embeddings[item.index] = item.embedding;
  }

  return { embeddings };
}

// Local caching of embedding vectors, keyed by model + dimensions + input text.
//
// Security note: the API key must NEVER be stored in this cache or alongside
// it. This module only ever reads/writes embedding vectors.

import type { EmbeddingModel } from "../types";

const CACHE_STORAGE_KEY = "oevp.embeddingCache.v1";

type CacheMap = Record<string, number[]>;

/**
 * Build a stable cache key from the model, optional dimensions, and the
 * input text. Normalization here is intentionally simple (trim only) since
 * this is a local developer tool, not a production-grade cache.
 */
export function buildCacheKey(
  model: EmbeddingModel,
  dimensions: number | undefined,
  input: string,
): string {
  const normalizedInput = input.trim();
  const dimensionsPart = dimensions ? String(dimensions) : "default";
  return `${model}\u0000${dimensionsPart}\u0000${normalizedInput}`;
}

function readCache(): CacheMap {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as CacheMap;
    }
    return {};
  } catch {
    // Corrupt or inaccessible storage: treat as an empty cache rather than crashing.
    return {};
  }
}

function writeCache(cache: CacheMap): void {
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage may be full or unavailable (e.g. private browsing). Caching
    // is a convenience feature, so we silently drop the write instead of
    // breaking the app.
  }
}

export function getCachedEmbedding(cacheKey: string): number[] | undefined {
  const cache = readCache();
  return cache[cacheKey];
}

export function setCachedEmbedding(
  cacheKey: string,
  embedding: number[],
): void {
  const cache = readCache();
  cache[cacheKey] = embedding;
  writeCache(cache);
}

export function clearEmbeddingCache(): void {
  try {
    localStorage.removeItem(CACHE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getEmbeddingCacheEntryCount(): number {
  return Object.keys(readCache()).length;
}

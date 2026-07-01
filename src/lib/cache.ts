// Local caching of embedding vectors, keyed by model + dimensions + input text.
//
// Security note: the API key must NEVER be stored in this cache or alongside
// it. This module only ever reads/writes embedding vectors.

import type { EmbeddingModel } from "../types";

const CACHE_STORAGE_KEY = "oevp.embeddingCache.v1";
const META_STORAGE_KEY = "oevp.embeddingMeta.v1";
const LIST_SETTINGS_STORAGE_KEY = "oevp.embeddingListSettings.v1";

type CacheMap = Record<string, number[]>;
type EmbeddingSource = "cache" | "api" | "import";

interface CacheMeta {
  input: string;
  model: EmbeddingModel;
  dimensions?: number;
  enabled: boolean;
  source: EmbeddingSource;
  createdAt: number;
  updatedAt: number;
}

type CacheMetaMap = Record<string, CacheMeta>;

export interface KnownEmbeddingEntry {
  cacheKey: string;
  input: string;
  model: EmbeddingModel;
  dimensions?: number;
  embedding: number[];
  enabled: boolean;
  source: EmbeddingSource;
  createdAt: number;
  updatedAt: number;
}

export type KnownEmbeddingsSortMode = "recent" | "alphabetical";

interface KnownEmbeddingsListSettings {
  sortMode: KnownEmbeddingsSortMode;
}

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

function readMeta(): CacheMetaMap {
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as CacheMetaMap;
    }
    return {};
  } catch {
    return {};
  }
}

function writeMeta(meta: CacheMetaMap): void {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // Metadata is convenience-only. If write fails, keep app usable.
  }
}

function readListSettings(): KnownEmbeddingsListSettings {
  try {
    const raw = localStorage.getItem(LIST_SETTINGS_STORAGE_KEY);
    if (!raw) return { sortMode: "recent" };
    const parsed = JSON.parse(raw) as Partial<KnownEmbeddingsListSettings>;
    if (parsed.sortMode === "alphabetical" || parsed.sortMode === "recent") {
      return { sortMode: parsed.sortMode };
    }
    return { sortMode: "recent" };
  } catch {
    return { sortMode: "recent" };
  }
}

function writeListSettings(settings: KnownEmbeddingsListSettings): void {
  try {
    localStorage.setItem(LIST_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures for non-critical settings.
  }
}

function parseCacheKey(
  cacheKey: string,
): { model: EmbeddingModel; dimensions?: number; input: string } | null {
  const [modelPart, dimensionsPart, ...rest] = cacheKey.split("\u0000");
  const input = rest.join("\u0000");

  if (
    modelPart !== "text-embedding-3-small" &&
    modelPart !== "text-embedding-3-large"
  ) {
    return null;
  }

  if (!dimensionsPart || input.length === 0) {
    return null;
  }

  return {
    model: modelPart,
    dimensions:
      dimensionsPart === "default" ? undefined : Number(dimensionsPart),
    input,
  };
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

export function upsertKnownEmbedding(params: {
  model: EmbeddingModel;
  dimensions: number | undefined;
  input: string;
  embedding: number[];
  source: EmbeddingSource;
}): string {
  const cacheKey = buildCacheKey(params.model, params.dimensions, params.input);
  const now = Date.now();

  const cache = readCache();
  cache[cacheKey] = params.embedding;
  writeCache(cache);

  const meta = readMeta();
  const previous = meta[cacheKey];
  meta[cacheKey] = {
    input: params.input.trim(),
    model: params.model,
    dimensions: params.dimensions,
    enabled: previous ? previous.enabled : true,
    source: params.source,
    createdAt: previous ? previous.createdAt : now,
    updatedAt: now,
  };
  writeMeta(meta);

  return cacheKey;
}

export function listKnownEmbeddings(
  model: EmbeddingModel,
  dimensions: number | undefined,
): KnownEmbeddingEntry[] {
  const cache = readCache();
  const meta = readMeta();
  let metaChanged = false;

  const entries: KnownEmbeddingEntry[] = [];
  for (const [cacheKey, embedding] of Object.entries(cache)) {
    const parsed = parseCacheKey(cacheKey);
    if (!parsed) continue;
    if (parsed.model !== model || parsed.dimensions !== dimensions) continue;

    const currentMeta = meta[cacheKey];
    const fallbackTimestamp = 0;
    const normalizedMeta: CacheMeta = currentMeta ?? {
      input: parsed.input,
      model: parsed.model,
      dimensions: parsed.dimensions,
      enabled: true,
      source: "cache",
      createdAt: fallbackTimestamp,
      updatedAt: fallbackTimestamp,
    };

    if (!currentMeta) {
      meta[cacheKey] = normalizedMeta;
      metaChanged = true;
    }

    entries.push({
      cacheKey,
      input: normalizedMeta.input,
      model: normalizedMeta.model,
      dimensions: normalizedMeta.dimensions,
      embedding,
      enabled: normalizedMeta.enabled,
      source: normalizedMeta.source,
      createdAt: normalizedMeta.createdAt,
      updatedAt: normalizedMeta.updatedAt,
    });
  }

  if (metaChanged) {
    writeMeta(meta);
  }

  return entries;
}

export function setKnownEmbeddingEnabled(
  cacheKey: string,
  enabled: boolean,
): void {
  const parsed = parseCacheKey(cacheKey);
  if (!parsed) return;

  const meta = readMeta();
  const previous = meta[cacheKey];
  const now = Date.now();

  meta[cacheKey] = {
    input: previous?.input ?? parsed.input,
    model: previous?.model ?? parsed.model,
    dimensions: previous?.dimensions ?? parsed.dimensions,
    enabled,
    source: previous?.source ?? "cache",
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };

  writeMeta(meta);
}

export function setAllKnownEmbeddingsEnabled(
  model: EmbeddingModel,
  dimensions: number | undefined,
  enabled: boolean,
): void {
  const entries = listKnownEmbeddings(model, dimensions);
  const meta = readMeta();
  const now = Date.now();

  for (const entry of entries) {
    const previous = meta[entry.cacheKey];
    meta[entry.cacheKey] = {
      input: previous?.input ?? entry.input,
      model: previous?.model ?? entry.model,
      dimensions: previous?.dimensions ?? entry.dimensions,
      enabled,
      source: previous?.source ?? entry.source,
      createdAt: previous?.createdAt ?? entry.createdAt,
      updatedAt: now,
    };
  }

  writeMeta(meta);
}

export function deleteKnownEmbedding(cacheKey: string): void {
  const cache = readCache();
  delete cache[cacheKey];
  writeCache(cache);

  const meta = readMeta();
  delete meta[cacheKey];
  writeMeta(meta);
}

export function getKnownEmbeddingsSortMode(): KnownEmbeddingsSortMode {
  return readListSettings().sortMode;
}

export function setKnownEmbeddingsSortMode(
  sortMode: KnownEmbeddingsSortMode,
): void {
  writeListSettings({ sortMode });
}

export function clearEmbeddingCache(): void {
  try {
    localStorage.removeItem(CACHE_STORAGE_KEY);
    localStorage.removeItem(META_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getEmbeddingCacheEntryCount(): number {
  return Object.keys(readCache()).length;
}

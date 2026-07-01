import { useEffect, useMemo, useState } from "react";
import { ApiKeyInput } from "./components/ApiKeyInput";
import { ExportImport } from "./components/ExportImport";
import { InputEditor } from "./components/InputEditor";
import { KnownEmbeddingsList } from "./components/KnownEmbeddingsList";
import { ModelSelector } from "./components/ModelSelector";
import { RankingList } from "./components/RankingList";
import { ScatterPlot } from "./components/ScatterPlot";
import { SimilarityMatrix } from "./components/SimilarityMatrix";
import { useEmbeddingSettings } from "./context/EmbeddingSettingsContext";
import {
  buildCacheKey,
  clearEmbeddingCache,
  deleteKnownEmbedding,
  getCachedEmbedding,
  getEmbeddingCacheEntryCount,
  getKnownEmbeddingsSortMode,
  listKnownEmbeddings,
  setAllKnownEmbeddingsEnabled,
  setKnownEmbeddingEnabled,
  setKnownEmbeddingsSortMode,
  upsertKnownEmbedding,
} from "./lib/cache";
import { fetchEmbeddings, OpenAIRequestError } from "./lib/openaiEmbeddings";
import { buildSimilarityMatrix } from "./lib/similarity";
import type { ExperimentExport } from "./types";

const API_KEY_STORAGE_KEY = "oevp.apiKey";

function parseInputLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem(API_KEY_STORAGE_KEY) ?? "",
  );
  const [rememberKey, setRememberKey] = useState<boolean>(
    () => localStorage.getItem(API_KEY_STORAGE_KEY) !== null,
  );
  const [inputText, setInputText] = useState("");
  const { model, setModel, dimensions, setDimensions } = useEmbeddingSettings();
  const [useCache, setUseCache] = useState(true);
  const [cacheEntryCount, setCacheEntryCount] = useState(() =>
    getEmbeddingCacheEntryCount(),
  );
  const [knownRevision, setKnownRevision] = useState(0);
  const [sortMode, setSortMode] = useState(() => getKnownEmbeddingsSortMode());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestFetchStatus, setLatestFetchStatus] = useState<
    Array<{ input: string; source: "cache" | "api" }>
  >([]);
  const [focusedCacheKey, setFocusedCacheKey] = useState<string | null>(null);

  const parsedInputs = useMemo(() => parseInputLines(inputText), [inputText]);

  const knownEntries = useMemo(() => {
    const entries = listKnownEmbeddings(model, dimensions);
    if (sortMode === "alphabetical") {
      entries.sort((a, b) => a.input.localeCompare(b.input));
    } else {
      entries.sort((a, b) => {
        const updatedDiff = b.updatedAt - a.updatedAt;
        if (updatedDiff !== 0) return updatedDiff;
        const createdDiff = b.createdAt - a.createdAt;
        if (createdDiff !== 0) return createdDiff;
        return a.input.localeCompare(b.input);
      });
    }
    return entries;
  }, [model, dimensions, knownRevision, sortMode]);

  const visibleEntries = useMemo(
    () => knownEntries.filter((entry) => entry.enabled),
    [knownEntries],
  );

  const inputs = useMemo(
    () => visibleEntries.map((entry) => entry.input),
    [visibleEntries],
  );
  const embeddings = useMemo(
    () => visibleEntries.map((entry) => entry.embedding),
    [visibleEntries],
  );
  const similarityMatrix = useMemo(
    () => buildSimilarityMatrix(embeddings),
    [embeddings],
  );
  const focusedVisibleIndex = useMemo(() => {
    if (focusedCacheKey === null) return null;
    const index = visibleEntries.findIndex(
      (entry) => entry.cacheKey === focusedCacheKey,
    );
    return index >= 0 ? index : null;
  }, [focusedCacheKey, visibleEntries]);

  useEffect(() => {
    if (
      focusedCacheKey !== null &&
      !knownEntries.some(
        (entry) => entry.cacheKey === focusedCacheKey && entry.enabled,
      )
    ) {
      setFocusedCacheKey(null);
    }
  }, [focusedCacheKey, knownEntries]);

  function handleRememberKeyChange(remember: boolean) {
    setRememberKey(remember);
    if (remember) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    if (rememberKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, value);
    }
  }

  function handleClearCache() {
    clearEmbeddingCache();
    setCacheEntryCount(0);
    setKnownRevision((value) => value + 1);
    setFocusedCacheKey(null);
  }

  function handleReloadKnownEmbeddings() {
    setInputText(knownEntries.map((entry) => entry.input).join("\n"));
    setCacheEntryCount(getEmbeddingCacheEntryCount());
    setKnownRevision((value) => value + 1);
  }

  async function handleFetch() {
    setError(null);

    if (!apiKey.trim()) {
      setError("Please enter your OpenAI API key first.");
      return;
    }
    if (parsedInputs.length === 0) {
      setError("Please enter at least one non-empty input line.");
      return;
    }

    setLoading(true);
    try {
      // Resolve what we can from the cache first (if enabled), and collect
      // the unique set of inputs that still need an API call.
      const missing = new Set<string>();

      for (const input of parsedInputs) {
        const key = buildCacheKey(model, dimensions, input);
        const cached = useCache ? getCachedEmbedding(key) : undefined;
        if (cached) {
          upsertKnownEmbedding({
            model,
            dimensions,
            input,
            embedding: cached,
            source: "cache",
          });
        } else {
          missing.add(input);
        }
      }

      if (missing.size > 0) {
        const missingList = Array.from(missing);
        const { embeddings: fetched } = await fetchEmbeddings({
          apiKey,
          inputs: missingList,
          model,
          dimensions,
        });
        missingList.forEach((input, i) => {
          const embedding = fetched[i];
          upsertKnownEmbedding({
            model,
            dimensions,
            input,
            embedding,
            source: "api",
          });
        });
        setCacheEntryCount(getEmbeddingCacheEntryCount());
      }

      // Ensure metadata exists even when every requested embedding came from cache.
      if (missing.size === 0) {
        setCacheEntryCount(getEmbeddingCacheEntryCount());
      }

      setLatestFetchStatus(
        parsedInputs.map((input) => ({
          input,
          source: missing.has(input) ? "api" : "cache",
        })),
      );

      setKnownRevision((value) => value + 1);
    } catch (err) {
      if (err instanceof OpenAIRequestError) {
        setError(err.message);
      } else {
        setError("Unexpected error while fetching embeddings.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleImport(data: ExperimentExport) {
    setModel(data.model);
    setDimensions(data.dimensions);
    setInputText(data.inputs.join("\n"));
    data.inputs.forEach((input, i) => {
      upsertKnownEmbedding({
        model: data.model,
        dimensions: data.dimensions,
        input,
        embedding: data.embeddings[i],
        source: "import",
      });
    });
    setCacheEntryCount(getEmbeddingCacheEntryCount());
    setKnownRevision((value) => value + 1);
    setFocusedCacheKey(null);
    setError(null);
    setLatestFetchStatus([]);
  }

  function handleKnownToggle(cacheKey: string, enabled: boolean) {
    setKnownEmbeddingEnabled(cacheKey, enabled);
    setKnownRevision((value) => value + 1);
  }

  function handleKnownDelete(cacheKey: string) {
    deleteKnownEmbedding(cacheKey);
    setCacheEntryCount(getEmbeddingCacheEntryCount());
    setKnownRevision((value) => value + 1);
    setFocusedCacheKey((current) => (current === cacheKey ? null : current));
  }

  function handleFocusToggle(cacheKey: string) {
    setFocusedCacheKey((current) => (current === cacheKey ? null : cacheKey));
  }

  function handleSortModeChange(nextSortMode: "recent" | "alphabetical") {
    setSortMode(nextSortMode);
    setKnownEmbeddingsSortMode(nextSortMode);
  }

  function handleToggleAllKnown(enabled: boolean) {
    setAllKnownEmbeddingsEnabled(model, dimensions, enabled);
    setKnownRevision((value) => value + 1);
    if (!enabled) {
      setFocusedCacheKey(null);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>OpenAI Vector Embeddings Playground</h1>
      </header>

      <ModelSelector
        useCache={useCache}
        onUseCacheChange={setUseCache}
        cacheEntryCount={cacheEntryCount}
        onClearCache={handleClearCache}
      />

      <p className="warning-banner">
        ⚠️ This app sends your inputs directly from your browser to OpenAI's API
        using the key you provide. It is intended for local, private
        experimentation with your own key — do not use it with a key you don't
        control. No analytics, tracking, or third-party services are used;
        nothing is sent anywhere except directly to OpenAI.
      </p>

      <div className="layout">
        <div className="column">
          <ApiKeyInput
            apiKey={apiKey}
            onApiKeyChange={handleApiKeyChange}
            rememberKey={rememberKey}
            onRememberKeyChange={handleRememberKeyChange}
          />

          <div className="panel">
            <ExportImport
              inputs={inputs}
              embeddings={embeddings}
              similarities={similarityMatrix}
              onImport={handleImport}
              onError={setError}
            />
          </div>

          {error && <p className="error-text">{error}</p>}
          {loading && <p className="hint-text">Fetching embeddings…</p>}

          <p className="hint-text">
            {parsedInputs.length} input line(s) in editor · {inputs.length}{" "}
            shown · {cacheEntryCount} cached
          </p>
        </div>

        <div className="column">
          <InputEditor
            text={inputText}
            onTextChange={setInputText}
            inputCount={parsedInputs.length}
            loading={loading}
            onFetch={() => void handleFetch()}
            onLoadKnownEmbeddings={handleReloadKnownEmbeddings}
            fetchStatus={latestFetchStatus}
          />

          <KnownEmbeddingsList
            entries={knownEntries}
            onToggle={handleKnownToggle}
            onDelete={handleKnownDelete}
            focusedCacheKey={focusedCacheKey}
            onFocusToggle={handleFocusToggle}
            sortMode={sortMode}
            onSortModeChange={handleSortModeChange}
            onToggleAll={handleToggleAllKnown}
          />

          <div className="panel">
            <h2>Similarity matrix</h2>
            <SimilarityMatrix
              inputs={inputs}
              matrix={similarityMatrix}
              focusedIndex={focusedVisibleIndex}
            />
          </div>

          <div className="panel">
            <h2>Ranked similarity</h2>
            <RankingList
              inputs={inputs}
              embeddings={embeddings}
              focusedIndex={focusedVisibleIndex}
            />
          </div>

          <div className="panel">
            <h2>2D scatter plot (PCA)</h2>
            <ScatterPlot
              inputs={inputs}
              embeddings={embeddings}
              focusedIndex={focusedVisibleIndex}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

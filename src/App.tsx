import { useMemo, useState } from "react";
import { ApiKeyInput } from "./components/ApiKeyInput";
import { ExportImport } from "./components/ExportImport";
import { InputEditor } from "./components/InputEditor";
import { ModelSelector } from "./components/ModelSelector";
import { RankingList } from "./components/RankingList";
import { ScatterPlot } from "./components/ScatterPlot";
import { SimilarityMatrix } from "./components/SimilarityMatrix";
import {
  buildCacheKey,
  clearEmbeddingCache,
  getCachedEmbedding,
  getEmbeddingCacheEntryCount,
  setCachedEmbedding,
} from "./lib/cache";
import { fetchEmbeddings, OpenAIRequestError } from "./lib/openaiEmbeddings";
import { buildSimilarityMatrix } from "./lib/similarity";
import type {
  EmbeddingModel,
  EmbeddingRecord,
  ExperimentExport,
} from "./types";

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
  const [model, setModel] = useState<EmbeddingModel>("text-embedding-3-small");
  const [dimensions, setDimensions] = useState<number | undefined>(undefined);
  const [useCache, setUseCache] = useState(true);
  const [cacheEntryCount, setCacheEntryCount] = useState(() =>
    getEmbeddingCacheEntryCount(),
  );
  const [records, setRecords] = useState<EmbeddingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQueryIndex, setSelectedQueryIndex] = useState<number | null>(
    null,
  );
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const parsedInputs = useMemo(() => parseInputLines(inputText), [inputText]);

  const inputs = useMemo(() => records.map((r) => r.input), [records]);
  const embeddings = useMemo(() => records.map((r) => r.embedding), [records]);
  const similarityMatrix = useMemo(
    () => buildSimilarityMatrix(embeddings),
    [embeddings],
  );

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
      const resolved = new Map<string, number[]>();
      const missing = new Set<string>();

      for (const input of parsedInputs) {
        const key = buildCacheKey(model, dimensions, input);
        const cached = useCache ? getCachedEmbedding(key) : undefined;
        if (cached) {
          resolved.set(input, cached);
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
          resolved.set(input, embedding);
          const key = buildCacheKey(model, dimensions, input);
          setCachedEmbedding(key, embedding);
        });
        setCacheEntryCount(getEmbeddingCacheEntryCount());
      }

      const newRecords: EmbeddingRecord[] = parsedInputs.map((input) => ({
        input,
        model,
        dimensions,
        embedding: resolved.get(input)!,
        source: missing.has(input) ? "api" : "cache",
      }));
      setRecords(newRecords);
      setSelectedQueryIndex(null);
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

  function handleClearResults() {
    setRecords([]);
    setError(null);
    setSelectedQueryIndex(null);
  }

  function handleImport(data: ExperimentExport) {
    setModel(data.model);
    setDimensions(data.dimensions);
    setInputText(data.inputs.join("\n"));
    setRecords(
      data.inputs.map((input, i) => ({
        input,
        model: data.model,
        dimensions: data.dimensions,
        embedding: data.embeddings[i],
        source: "import" as const,
      })),
    );
    setSelectedQueryIndex(null);
    setError(null);
  }

  return (
    <div className={`app app--${theme}`}>
      <header className="app-header">
        <h1>OpenAI Vector Embeddings Playground</h1>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        >
          {theme === "light" ? "Dark mode" : "Light mode"}
        </button>
      </header>

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

          <InputEditor
            text={inputText}
            onTextChange={setInputText}
            inputCount={parsedInputs.length}
            loading={loading}
            onFetch={() => void handleFetch()}
            onClear={handleClearResults}
          />

          <ModelSelector
            model={model}
            onModelChange={setModel}
            dimensions={dimensions}
            onDimensionsChange={setDimensions}
            useCache={useCache}
            onUseCacheChange={setUseCache}
            cacheEntryCount={cacheEntryCount}
            onClearCache={handleClearCache}
          />

          <div className="panel">
            <ExportImport
              model={model}
              dimensions={dimensions}
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
            {parsedInputs.length} input line(s) in editor · {records.length}{" "}
            embedded · {cacheEntryCount} cached
          </p>
        </div>

        <div className="column">
          {records.length > 0 && (
            <div className="panel">
              <h2>Embedding status</h2>
              <ul className="status-list">
                {records.map((record, i) => (
                  <li key={i} title={record.input}>
                    <span
                      className={`source-badge source-badge--${record.source}`}
                    >
                      {record.source}
                    </span>
                    {record.input}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="panel">
            <h2>Similarity matrix</h2>
            <SimilarityMatrix inputs={inputs} matrix={similarityMatrix} />
          </div>

          <div className="panel">
            <h2>Ranked similarity</h2>
            <RankingList
              inputs={inputs}
              embeddings={embeddings}
              selectedIndex={selectedQueryIndex}
              onSelectedIndexChange={setSelectedQueryIndex}
            />
          </div>

          <div className="panel">
            <h2>2D scatter plot (PCA)</h2>
            <ScatterPlot inputs={inputs} embeddings={embeddings} />
          </div>
        </div>
      </div>
    </div>
  );
}

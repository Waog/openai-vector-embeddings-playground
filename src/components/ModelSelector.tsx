import { useEmbeddingSettings } from "../context/EmbeddingSettingsContext";
import type { EmbeddingModel } from "../types";

interface ModelSelectorProps {
  useCache: boolean;
  onUseCacheChange: (value: boolean) => void;
  cacheEntryCount: number;
  onClearCache: () => void;
}

const MODELS: EmbeddingModel[] = [
  "text-embedding-3-small",
  "text-embedding-3-large",
];

/** Model + optional dimensions selector, plus cache controls. */
export function ModelSelector({
  useCache,
  onUseCacheChange,
  cacheEntryCount,
  onClearCache,
}: ModelSelectorProps) {
  const { model, setModel, dimensions, setDimensions } = useEmbeddingSettings();

  return (
    <div className="panel">
      <div className="field-row">
        <div>
          <label className="field-label" htmlFor="model-select">
            Model
          </label>
          <select
            id="model-select"
            value={model}
            onChange={(e) => setModel(e.target.value as EmbeddingModel)}
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="dimensions-input">
            Dimensions (optional)
          </label>
          <input
            id="dimensions-input"
            type="number"
            min={1}
            placeholder="default"
            value={dimensions ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              setDimensions(raw === "" ? undefined : Number(raw));
            }}
          />
        </div>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={useCache}
          onChange={(e) => onUseCacheChange(e.target.checked)}
        />
        Use cache
      </label>

      <div className="button-row">
        <span className="hint-text">{cacheEntryCount} cached embedding(s)</span>
        <button type="button" onClick={onClearCache}>
          Clear embedding cache
        </button>
      </div>
    </div>
  );
}

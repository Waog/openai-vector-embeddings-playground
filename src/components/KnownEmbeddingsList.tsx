import type {
  KnownEmbeddingEntry,
  KnownEmbeddingsSortMode,
} from "../lib/cache";

interface KnownEmbeddingsListProps {
  entries: KnownEmbeddingEntry[];
  onToggle: (cacheKey: string, enabled: boolean) => void;
  onDelete: (cacheKey: string) => void;
  focusedCacheKey: string | null;
  onFocusToggle: (cacheKey: string) => void;
  sortMode: KnownEmbeddingsSortMode;
  onSortModeChange: (mode: KnownEmbeddingsSortMode) => void;
  onToggleAll: (enabled: boolean) => void;
}

function formatTimestamp(ms: number): string {
  if (!ms) return "legacy";
  return new Date(ms).toLocaleString();
}

function nextSortMode(
  current: KnownEmbeddingsSortMode,
): KnownEmbeddingsSortMode {
  return current === "recent" ? "alphabetical" : "recent";
}

export function KnownEmbeddingsList({
  entries,
  onToggle,
  onDelete,
  focusedCacheKey,
  onFocusToggle,
  sortMode,
  onSortModeChange,
  onToggleAll,
}: KnownEmbeddingsListProps) {
  const enabledCount = entries.filter((entry) => entry.enabled).length;
  const sortTitle =
    sortMode === "recent"
      ? "Sorting: most recent. Click to switch to alphabetical."
      : "Sorting: alphabetical. Click to switch to most recent.";

  return (
    <div className="panel">
      <div className="known-list-header">
        <h2>Known embeddings</h2>
        <span className="hint-text">
          {enabledCount}/{entries.length} enabled
        </span>
      </div>

      <div className="button-row known-list-controls-row">
        <button
          type="button"
          onClick={() => onToggleAll(true)}
          disabled={entries.length === 0}
        >
          Enable all
        </button>
        <button
          type="button"
          onClick={() => onToggleAll(false)}
          disabled={entries.length === 0 || enabledCount === 0}
        >
          Disable all
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => onSortModeChange(nextSortMode(sortMode))}
          title={sortTitle}
          aria-label={sortTitle}
        >
          ⇅
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="hint-text">
          No known embeddings for this model and dimensions yet.
        </p>
      ) : (
        <ul className="known-list">
          {entries.map((entry) => (
            <li key={entry.cacheKey} className="known-list-item">
              <label
                className="known-item-main"
                title={`Updated: ${formatTimestamp(entry.updatedAt)}`}
              >
                <input
                  type="checkbox"
                  checked={entry.enabled}
                  onChange={(e) => onToggle(entry.cacheKey, e.target.checked)}
                />
                <span className="known-item-text">{entry.input}</span>
              </label>

              <button
                type="button"
                className={`icon-button icon-button--focus${
                  focusedCacheKey === entry.cacheKey
                    ? " icon-button--focus-active"
                    : ""
                }`}
                disabled={!entry.enabled}
                onClick={() => onFocusToggle(entry.cacheKey)}
                title={
                  !entry.enabled
                    ? "Enable this entry to focus it"
                    : focusedCacheKey === entry.cacheKey
                      ? "Clear focused entry"
                      : "Focus this entry"
                }
                aria-label={
                  !entry.enabled
                    ? "Enable this entry to focus it"
                    : focusedCacheKey === entry.cacheKey
                      ? "Clear focused entry"
                      : "Focus this entry"
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <path
                    d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
                    fill="currentColor"
                  />
                </svg>
              </button>

              <button
                type="button"
                className="icon-button icon-button--danger"
                onClick={() => onDelete(entry.cacheKey)}
                title="Delete embedding"
                aria-label="Delete embedding"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <path
                    d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 11H8L7 9Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const EXAMPLE_INPUTS = [
  "Angular",
  "software skill: Angular",
  "Angular framework",
  "RxJS",
  "close collaboration with UI/UX team",
  "enge Zusammenarbeit mit UI/UX-Team",
  "project evidence: collaborated with UX designers and product owners",
].join("\n");

interface InputEditorProps {
  text: string;
  onTextChange: (value: string) => void;
  inputCount: number;
  loading: boolean;
  onFetch: () => void;
  onLoadKnownEmbeddings: () => void;
  fetchStatus: Array<{ input: string; source: "cache" | "api" }>;
}

/** Textarea for one input per line, plus the main action buttons. */
export function InputEditor({
  text,
  onTextChange,
  inputCount,
  loading,
  onFetch,
  onLoadKnownEmbeddings,
  fetchStatus,
}: InputEditorProps) {
  return (
    <div className="panel">
      <label className="field-label" htmlFor="input-editor">
        Inputs (one per line)
      </label>
      <div className="input-editor-wrap">
        <div className="input-editor-overlay-controls">
          <button
            type="button"
            className="button-compact"
            onClick={() => onTextChange(EXAMPLE_INPUTS)}
            disabled={loading}
          >
            Load example set
          </button>
          <button
            type="button"
            className="button-compact"
            onClick={onLoadKnownEmbeddings}
            disabled={loading}
          >
            Load known embeddings
          </button>
        </div>

        <textarea
          id="input-editor"
          rows={10}
          placeholder={EXAMPLE_INPUTS}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
        />
      </div>
      <p className="hint-text">
        {inputCount} non-empty input{inputCount === 1 ? "" : "s"} will be
        embedded. Blank lines are ignored.
      </p>
      <div className="button-row">
        <button
          type="button"
          onClick={onFetch}
          disabled={loading || inputCount === 0}
        >
          {loading ? "Fetching…" : "Fetch embeddings"}
        </button>
      </div>

      {fetchStatus.length > 0 && (
        <ul className="fetch-status-list">
          {fetchStatus.map((entry, i) => (
            <li key={`${entry.input}-${i}`} title={entry.input}>
              <span className={`source-badge source-badge--${entry.source}`}>
                {entry.source}
              </span>
              <span className="fetch-status-text">{entry.input}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

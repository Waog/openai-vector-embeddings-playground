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
  onClear: () => void;
}

/** Textarea for one input per line, plus the main action buttons. */
export function InputEditor({
  text,
  onTextChange,
  inputCount,
  loading,
  onFetch,
  onClear,
}: InputEditorProps) {
  return (
    <div className="panel">
      <label className="field-label" htmlFor="input-editor">
        Inputs (one per line)
      </label>
      <textarea
        id="input-editor"
        rows={10}
        placeholder={EXAMPLE_INPUTS}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
      />
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
        <button type="button" onClick={onClear} disabled={loading}>
          Clear results
        </button>
        <button
          type="button"
          onClick={() => onTextChange(EXAMPLE_INPUTS)}
          disabled={loading}
        >
          Load example set
        </button>
      </div>
    </div>
  );
}

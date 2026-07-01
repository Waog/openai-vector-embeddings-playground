import { useState } from "react";

interface ApiKeyInputProps {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  rememberKey: boolean;
  onRememberKeyChange: (value: boolean) => void;
}

/**
 * API key entry field. The key lives only in React state (i.e. browser
 * memory) unless the user explicitly opts in to persisting it in
 * localStorage via the "remember" checkbox — see the warning text below.
 */
export function ApiKeyInput({
  apiKey,
  onApiKeyChange,
  rememberKey,
  onRememberKeyChange,
}: ApiKeyInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="panel">
      <label className="field-label" htmlFor="api-key-input">
        OpenAI API key
      </label>
      <div className="api-key-row">
        <input
          id="api-key-input"
          type={visible ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
        />
        <button type="button" onClick={() => setVisible((v) => !v)}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={rememberKey}
          onChange={(e) => onRememberKeyChange(e.target.checked)}
        />
        Remember API key in localStorage (this device only)
      </label>

      <p className="warning-text">
        <strong>Security warning:</strong> this app calls the OpenAI API
        directly from your browser, which means your API key is present in this
        page's memory and in every request your browser sends. Only use a key
        here that you own and control, ideally one scoped/rotatable for
        experimentation. Do not use this tool with a shared or production key.
        If you enable "remember", the key is stored in plain text in this
        browser's localStorage until you clear it — anyone with access to this
        browser profile could read it.
      </p>
    </div>
  );
}

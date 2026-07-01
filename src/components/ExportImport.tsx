import { useRef } from "react";
import { useEmbeddingSettings } from "../context/EmbeddingSettingsContext";
import type { EmbeddingModel, ExperimentExport } from "../types";

interface ExportImportProps {
  inputs: string[];
  embeddings: number[][];
  similarities: number[][];
  onImport: (data: ExperimentExport) => void;
  onError: (message: string) => void;
}

const ALLOWED_MODELS: EmbeddingModel[] = [
  "text-embedding-3-small",
  "text-embedding-3-large",
];

/** Basic structural validation for an imported experiment JSON file. */
function validateExperimentExport(value: unknown): ExperimentExport {
  if (!value || typeof value !== "object") {
    throw new Error("Imported file is not a JSON object.");
  }
  const data = value as Partial<ExperimentExport>;

  if (!data.model || !ALLOWED_MODELS.includes(data.model)) {
    throw new Error(
      'Imported file has a missing or unrecognized "model" field.',
    );
  }
  if (
    !Array.isArray(data.inputs) ||
    !data.inputs.every((v) => typeof v === "string")
  ) {
    throw new Error(
      'Imported file has an invalid "inputs" field (expected string array).',
    );
  }
  if (
    !Array.isArray(data.embeddings) ||
    !data.embeddings.every(
      (v) => Array.isArray(v) && v.every((n) => typeof n === "number"),
    )
  ) {
    throw new Error(
      'Imported file has an invalid "embeddings" field (expected number[][]).',
    );
  }
  if (data.embeddings.length !== data.inputs.length) {
    throw new Error(
      'Imported file: "inputs" and "embeddings" must have the same length.',
    );
  }
  if (data.dimensions !== undefined && typeof data.dimensions !== "number") {
    throw new Error('Imported file has an invalid "dimensions" field.');
  }

  return {
    model: data.model,
    dimensions: data.dimensions,
    inputs: data.inputs,
    embeddings: data.embeddings,
    similarities: Array.isArray(data.similarities) ? data.similarities : [],
  };
}

/** Export the current experiment to a JSON file, or import one from disk. */
export function ExportImport({
  inputs,
  embeddings,
  similarities,
  onImport,
  onError,
}: ExportImportProps) {
  const { model, dimensions } = useEmbeddingSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const payload: ExperimentExport = {
      model,
      dimensions,
      inputs,
      embeddings,
      similarities,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "embeddings-experiment.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const parsed = validateExperimentExport(JSON.parse(text));
      onImport(parsed);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to import file.");
    }
  }

  return (
    <div className="button-row">
      <button
        type="button"
        onClick={handleExport}
        disabled={inputs.length === 0}
      >
        Export JSON
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()}>
        Import JSON
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImportFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

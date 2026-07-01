import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { EmbeddingModel } from "../types";

interface EmbeddingSettingsContextValue {
  model: EmbeddingModel;
  setModel: Dispatch<SetStateAction<EmbeddingModel>>;
  dimensions: number | undefined;
  setDimensions: Dispatch<SetStateAction<number | undefined>>;
}

const EmbeddingSettingsContext =
  createContext<EmbeddingSettingsContextValue | null>(null);

interface EmbeddingSettingsProviderProps {
  children: ReactNode;
}

export function EmbeddingSettingsProvider({
  children,
}: EmbeddingSettingsProviderProps) {
  const [model, setModel] = useState<EmbeddingModel>("text-embedding-3-small");
  const [dimensions, setDimensions] = useState<number | undefined>(undefined);

  const value = useMemo(
    () => ({ model, setModel, dimensions, setDimensions }),
    [model, dimensions],
  );

  return (
    <EmbeddingSettingsContext.Provider value={value}>
      {children}
    </EmbeddingSettingsContext.Provider>
  );
}

export function useEmbeddingSettings(): EmbeddingSettingsContextValue {
  const context = useContext(EmbeddingSettingsContext);
  if (!context) {
    throw new Error(
      "useEmbeddingSettings must be used within EmbeddingSettingsProvider.",
    );
  }
  return context;
}

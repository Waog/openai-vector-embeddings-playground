import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { EmbeddingSettingsProvider } from "./context/EmbeddingSettingsContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EmbeddingSettingsProvider>
      <App />
    </EmbeddingSettingsProvider>
  </StrictMode>,
);

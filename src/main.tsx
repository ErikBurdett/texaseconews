import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { initializeAnalytics } from "./lib/analytics";
import App from "./App";
import "./styles.css";

if (import.meta.env.PROD) initializeAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

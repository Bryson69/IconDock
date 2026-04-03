import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import App from "./App";
import "./styles/tailwind.css";
import { initWebflowDesigner } from "./webflow/initDesigner";

// Never block the first paint on `webflow.ready()` — if it rejects, the panel would stay blank.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

void initWebflowDesigner().catch(() => {
  // Non-fatal; ElementDashboard and other APIs call `ready()` when needed.
});


import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

if (import.meta.env.DEV) {
  const scenario = new URLSearchParams(window.location.search).get("mock");
  if (scenario) {
    const { installMock } = await import("./dev/mockTauri");
    installMock(scenario);
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

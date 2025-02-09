import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import React from "react";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

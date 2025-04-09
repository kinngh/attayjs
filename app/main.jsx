import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "./src/router";
import { RouterView } from "./src/RouterView";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider>
      <RouterView />
    </RouterProvider>
  </StrictMode>
);

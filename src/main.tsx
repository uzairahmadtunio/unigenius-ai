import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./pwa/register-sw";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker after the app mounts; guarded against dev/preview.
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    registerServiceWorker();
  });
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initNativeShell } from "./lib/native";
import "./index.css";

void initNativeShell();
createRoot(document.getElementById("root")!).render(<App />);

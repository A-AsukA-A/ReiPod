import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./style.css";
import "./ui/classic-lcd.css";
import "./ui/firmware-display.css";

createRoot(document.getElementById("root")!).render(<App />);

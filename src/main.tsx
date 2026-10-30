import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./fonts.css";
import "./style.css";
import "./ui/classic-lcd.css";
import "./ui/firmware-display.css";

createRoot(document.getElementById("root")!).render(<App />);

// Rasterizes design/icon.svg to design/icon.png (1024 x 1024, transparent corners),
// the source that `tauri icon` turns into every size the app needs.
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync(new URL("../design/icon.svg", import.meta.url));
const png = new Resvg(svg, { fitTo: { mode: "width", value: 1024 } }).render().asPng();
writeFileSync(new URL("../design/icon.png", import.meta.url), png);
console.log(`design/icon.png written (${png.length} bytes)`);

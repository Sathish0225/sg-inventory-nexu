// Copy the built web app (../dist, from `npm run build` in the repo root) into ./web.
const fs = require("fs");
const path = require("path");

const src = path.resolve(__dirname, "../../dist");
const dest = path.resolve(__dirname, "../web");
if (!fs.existsSync(path.join(src, "index.html"))) {
  console.error("Web build not found. Run `npm run build` in the repository root first.");
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`Copied web app to ${dest}`);

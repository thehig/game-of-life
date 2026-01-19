import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = resolve(rootDir, "src", "web");
const distDir = resolve(rootDir, "dist", "web");

await mkdir(distDir, { recursive: true });
await copyFile(resolve(srcDir, "index.html"), resolve(distDir, "index.html"));
await copyFile(resolve(srcDir, "styles.css"), resolve(distDir, "styles.css"));

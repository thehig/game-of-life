import { copyFile, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = resolve(rootDir, "src", "web");
const distDir = resolve(rootDir, "dist", "web");
const configSrcDir = resolve(rootDir, "config");
const configDistDir = resolve(distDir, "config");

await mkdir(distDir, { recursive: true });
await mkdir(configDistDir, { recursive: true });
await copyFile(resolve(srcDir, "index.html"), resolve(distDir, "index.html"));
await copyFile(resolve(srcDir, "styles.css"), resolve(distDir, "styles.css"));

const configEntries = await readdir(configSrcDir, { withFileTypes: true });
for (const entry of configEntries) {
  if (!entry.isFile()) {
    continue;
  }
  await copyFile(resolve(configSrcDir, entry.name), resolve(configDistDir, entry.name));
}

import { copyFile, mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = resolve(rootDir, "src", "web");
const distDir = resolve(rootDir, "dist", "web");
const distEngineDir = resolve(rootDir, "dist", "engine");
const distEngineTargetDir = resolve(distDir, "engine");
const configSrcDir = resolve(rootDir, "config");
const configDistDir = resolve(distDir, "config");

const copyDir = async (fromDir, toDir) => {
  await mkdir(toDir, { recursive: true });
  const entries = await readdir(fromDir, { withFileTypes: true });
  for (const entry of entries) {
    const fromPath = resolve(fromDir, entry.name);
    const toPath = resolve(toDir, entry.name);
    if (entry.isDirectory()) {
      await copyDir(fromPath, toPath);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    await copyFile(fromPath, toPath);
  }
};

await mkdir(distDir, { recursive: true });
await mkdir(configDistDir, { recursive: true });
await copyFile(resolve(srcDir, "index.html"), resolve(distDir, "index.html"));
await copyFile(resolve(srcDir, "styles.css"), resolve(distDir, "styles.css"));
try {
  await copyFile(resolve(srcDir, "favicon.svg"), resolve(distDir, "favicon.svg"));
} catch {
  // optional
}

await copyDir(distEngineDir, distEngineTargetDir);

const configEntries = await readdir(configSrcDir, { withFileTypes: true });
for (const entry of configEntries) {
  if (!entry.isFile()) {
    continue;
  }
  await copyFile(resolve(configSrcDir, entry.name), resolve(configDistDir, entry.name));
}

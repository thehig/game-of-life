import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(rootDir, "dist", "web");
const port = Number.parseInt(process.env.PORT ?? "5173", 10);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"]
]);

const clients = new Set();
let isBuilding = false;
let pendingBuild = false;
let debounceTimer;

const broadcastReload = () => {
  for (const res of clients) {
    res.write("data: reload\n\n");
  }
};

const runBuild = () => {
  if (isBuilding) {
    pendingBuild = true;
    return;
  }
  isBuilding = true;

  const child = spawn("npm", ["run", "build"], {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32"
  });

  child.on("close", (code) => {
    isBuilding = false;
    if (code === 0) {
      broadcastReload();
    } else {
      console.error(`Build failed with exit code ${code ?? "unknown"}`);
    }
    if (pendingBuild) {
      pendingBuild = false;
      runBuild();
    }
  });
};

const scheduleBuild = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(runBuild, 120);
};

const watchTargets = [
  resolve(rootDir, "src", "web"),
  resolve(rootDir, "src", "engine"),
  resolve(rootDir, "src", "engine", "rules"),
  resolve(rootDir, "src", "cli"),
  resolve(rootDir, "config")
];

for (const target of watchTargets) {
  try {
    watch(target, { recursive: false }, scheduleBuild);
  } catch (error) {
    console.error(`Unable to watch ${target}`, error);
  }
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  if (req.url.startsWith("/events")) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    res.write("retry: 1000\n\n");
    clients.add(res);

    req.on("close", () => {
      clients.delete(res);
    });
    return;
  }

  try {
    const requestUrl = new URL(req.url, "http://localhost");
    const pathName = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const filePath = resolve(distDir, `.${pathName}`);
    const contents = await readFile(filePath);
    const contentType = mimeTypes.get(extname(filePath)) ?? "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });
    res.end(contents);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
});

server.listen(port, () => {
  console.log(`Dev server on http://localhost:${port}`);
});

runBuild();

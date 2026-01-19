import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number.parseInt(process.env.PORT ?? "5173", 10);
const rootDir = resolve(
  resolve(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "dist",
  "web"
);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"]
]);

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const pathName = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const filePath = resolve(rootDir, `.${pathName}`);
    const contents = await readFile(filePath);
    const contentType = mimeTypes.get(extname(filePath)) ?? "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(contents);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
});

server.listen(port, () => {
  console.log(`Serving dist/web on http://localhost:${port}`);
});

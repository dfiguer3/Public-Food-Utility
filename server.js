const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 5173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function safeJoin(root, requestPath) {
  // Prevent path traversal (../) by resolving and re-checking prefix
  const resolved = path.resolve(root, "." + requestPath);
  if (!resolved.startsWith(path.resolve(root))) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url || "/", "http://localhost");
  let reqPath = decodeURIComponent(u.pathname || "/");
  if (reqPath === "/") reqPath = "/index.html";

  const filePath = safeJoin(ROOT, reqPath);
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`Serving ${ROOT}`);
  // eslint-disable-next-line no-console
  console.log(`http://localhost:${PORT}`);
});


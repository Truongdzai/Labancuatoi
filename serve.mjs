/* Máy chủ tĩnh nhỏ để thử PWA tại chỗ — service worker chỉ chạy trên
   https hoặc localhost, nên mở bằng file:// sẽ không cài được.

   Chạy:  node serve.mjs          → http://localhost:8080
          node serve.mjs 3000     → đổi cổng
   Dừng:  Ctrl+C
*/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.argv[2]) || 8080;
const ROOT = "app";

const KIEU = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ""));
    const s = await stat(file);
    if (!s.isFile()) throw new Error("không phải file");
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": KIEU[extname(file).toLowerCase()] || "application/octet-stream",
      // service worker phải được phục vụ không cache, nếu không bản mới không tới được máy
      "Cache-Control": file.endsWith("sw.js") ? "no-cache" : "no-store",
      "X-Robots-Tag": "noindex, nofollow"
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404");
  }
}).listen(PORT, () => {
  console.log(`Đang phục vụ thư mục ${ROOT}/ tại http://localhost:${PORT}`);
  console.log("Mở địa chỉ đó bằng Chrome để thử cài PWA. Ctrl+C để dừng.");
});

// Local, read-only preview of Firebase's static clean-URL routing.
// Run: node scripts/preview-fomo.mjs (no dependencies or build step).
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
http.createServer(async (req, res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.split('/').some(p => p.startsWith('.')) || /\.(?:json|mjs|md|zip|txt)$/i.test(pathname)) { res.writeHead(404).end(); return; }
    const relative = pathname === '/' ? 'desktop.html' : pathname.replace(/^\/+/, '');
    const base = path.resolve(root, relative);
    if (!base.startsWith(root)) { res.writeHead(403).end(); return; }
    for (const candidate of [base, `${base}.html`, path.join(base, 'index.html')]) {
      if (!(await stat(candidate).catch(() => null))?.isFile()) continue;
      const bytes = await readFile(candidate);
      res.writeHead(200, {'Content-Type':mime[path.extname(candidate)] || 'application/octet-stream','Cache-Control':'no-store'});
      res.end(req.method === 'HEAD' ? undefined : bytes); return;
    }
    res.writeHead(404).end('Page not found');
  } catch { res.writeHead(400).end('Invalid request'); }
}).listen(4181, '127.0.0.1', () => console.log('Campus preview: http://127.0.0.1:4181/campus/landing'));

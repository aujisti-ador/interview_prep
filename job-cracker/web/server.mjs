/**
 * Static file server + API proxy for the built SPA.
 *
 * Deliberately dependency-free and running on the same node:20-alpine base as
 * the build stage, so the whole stack needs exactly two base images. It does
 * the three things nginx was doing here: serve `dist`, fall back to the app
 * shell for client-side routes, and proxy `/api` to the API container.
 */
import { createServer, request as httpRequest } from 'node:http';
import { createReadStream, promises as fs } from 'node:fs';
import { createGzip } from 'node:zlib';
import { extname, join, normalize, resolve, sep } from 'node:path';

const PORT = Number(process.env.PORT || 80);
const ROOT = resolve(process.env.STATIC_ROOT || './dist');
const API_HOST = process.env.API_HOST || 'api';
const API_PORT = Number(process.env.API_PORT || 4000);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.map']);

function proxy(req, res) {
  const upstream = httpRequest(
    {
      host: API_HOST,
      port: API_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${API_HOST}:${API_PORT}` },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'api unreachable', detail: err.message }));
  });

  req.pipe(upstream);
}

async function serveFile(req, res, filePath, { immutable = false } = {}) {
  const ext = extname(filePath).toLowerCase();
  const headers = {
    'content-type': TYPES[ext] || 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  };

  const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip');
  if (acceptsGzip && COMPRESSIBLE.has(ext)) {
    headers['content-encoding'] = 'gzip';
    headers.vary = 'Accept-Encoding';
    res.writeHead(200, headers);
    createReadStream(filePath).pipe(createGzip()).pipe(res);
    return;
  }

  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
}

const server = createServer(async (req, res) => {
  if (req.url?.startsWith('/api/')) return proxy(req, res);

  // Strip the query string and refuse anything that escapes the static root.
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const candidate = resolve(join(ROOT, normalize(urlPath)));
  const inRoot = candidate === ROOT || candidate.startsWith(ROOT + sep);

  if (inRoot) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        return await serveFile(req, res, candidate, { immutable: urlPath.startsWith('/assets/') });
      }
    } catch {
      /* fall through to the SPA shell */
    }
  }

  // Client-side route: hand back index.html and let the router resolve it.
  try {
    return await serveFile(req, res, join(ROOT, 'index.html'));
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[job-cracker] web serving ${ROOT} on :${PORT}, proxying /api -> ${API_HOST}:${API_PORT}`);
});

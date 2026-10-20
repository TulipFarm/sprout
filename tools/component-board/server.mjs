import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Board, BoardError, maxPicked } from './board.mjs';
import { buildInventory } from './inventory.mjs';
import { createDispatcher } from './dispatcher.mjs';
import { repositoryRoot, boardDataDir } from './check.mjs';
import { writeJson } from './storage.mjs';
import { withLock } from './lock.mjs';

const publicDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);

const screenshotName = /^[a-z0-9][a-z0-9-]{0,127}$/;

function screenshotUrls(directory) {
  const urls = new Map();
  let names;
  try {
    names = readdirSync(directory);
  } catch {
    return urls;
  }
  for (const name of names) {
    const slug = name.slice(0, -4);
    if (!name.endsWith('.png') || !screenshotName.test(slug)) continue;
    const stats = statSync(path.join(directory, name), {
      throwIfNoEntry: false,
    });
    if (stats?.isFile()) urls.set(slug, `/screenshots/${slug}.png?v=${Math.trunc(stats.mtimeMs)}`);
  }
  return urls;
}

async function body(request) {
  if (!request.headers['content-type']?.startsWith('application/json'))
    throw new BoardError('Send application/json.', 415);
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 16384) throw new BoardError('Request body is too large.', 413);
    chunks.push(chunk);
  }
  let result;
  try {
    result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new BoardError('Invalid JSON.');
  }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new BoardError('Expected a JSON object.');
  return result;
}

export async function createBoardServer({
  dataDir,
  inventory,
  dispatcher,
  previewOrigin,
  polling = true,
  screenshotDir = path.join(dataDir, 'screenshots'),
}) {
  const board = await new Board({
    dataDir,
    inventory,
    dispatcher,
    previewOrigin,
  }).init();
  const streams = new Set();
  let screenshots = screenshotUrls(screenshotDir);
  function view(snapshot) {
    screenshots = screenshotUrls(screenshotDir);
    return {
      ...snapshot,
      cards: snapshot.cards.map(card => ({
        ...card,
        screenshot: screenshots.get(card.slug) ?? null,
      })),
    };
  }
  const server = http.createServer(async (request, response) => {
    const host = `127.0.0.1:${server.address().port}`;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    function json(value, status = 200) {
      response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(value));
    }
    try {
      if (request.headers.host !== host) throw new BoardError("Use the board's exact loopback address.", 403);
      if (request.headers.origin && request.headers.origin !== `http://${host}`)
        throw new BoardError('Cross-origin access is not allowed.', 403);
      if (request.headers['sec-fetch-site'] === 'cross-site')
        throw new BoardError('Cross-site access is not allowed.', 403);
      const url = new URL(request.url, `http://${host}`);
      if (request.method === 'GET') {
        if (assets.has(url.pathname)) {
          const [file, mime] = assets.get(url.pathname);
          const content = await readFile(path.join(publicDirectory, file));
          response.writeHead(200, { 'Content-Type': mime });
          response.end(content);
          return;
        }
        if (url.pathname === '/api/health') return json({ ok: true });
        if (url.pathname === '/api/board') return json(view(board.snapshot()));
        if (url.pathname === '/api/events') {
          response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            Connection: 'keep-alive',
          });
          response.write(`event: board\ndata: ${JSON.stringify(view(board.snapshot()))}\n\n`);
          streams.add(response);
          const ping = setInterval(() => response.write(': heartbeat\n\n'), 15000);
          response.once('close', () => {
            clearInterval(ping);
            streams.delete(response);
          });
          return;
        }
        const shot = url.pathname.match(/^\/screenshots\/([^/]+)\.png$/);
        if (shot) {
          let name;
          try {
            name = decodeURIComponent(shot[1]);
          } catch {
            name = '';
          }
          const file = path.resolve(screenshotDir, `${name}.png`);
          if (screenshotName.test(name) && path.dirname(file) === path.resolve(screenshotDir)) {
            const content = await readFile(file).catch(error => {
              if (error.code === 'ENOENT' || error.code === 'EISDIR') return null;
              throw error;
            });
            if (content) {
              response.writeHead(200, { 'Content-Type': 'image/png' });
              response.end(content);
              return;
            }
          }
          throw new BoardError('Not found.', 404);
        }
        const log = url.pathname.match(/^\/api\/cards\/([^/]+)\/log$/);
        if (log) {
          const card = board.card(decodeURIComponent(log[1]));
          return json({
            text: card.jobId ? await dispatcher.log(card.jobId) : '',
            stage: card.stage,
          });
        }
      }
      if (request.method === 'POST') {
        if (request.headers['x-board-token'] !== board.csrfToken)
          throw new BoardError('Missing or expired board token. Refresh the page.', 403);
        const payload = await body(request);
        if (url.pathname === '/api/queue') return json(await board.queue(payload));
        const action = url.pathname.match(/^\/api\/cards\/([^/]+)\/(move|retry)$/);
        if (action) return json(await board[action[2]](decodeURIComponent(action[1]), payload));
      }
      throw new BoardError('Not found.', 404);
    } catch (error) {
      if (!(error instanceof BoardError)) console.error('Board request failed:', error);
      if (!response.headersSent)
        json(
          {
            error:
              error instanceof BoardError
                ? error.message
                : 'Board operation failed. See the server terminal; state was not discarded.',
          },
          error.status ?? 500,
        );
      else response.end();
    }
  });
  function broadcast(snapshot) {
    const data = JSON.stringify(view(snapshot));
    for (const stream of streams) {
      if (stream.writableLength > 1024 * 1024) {
        stream.end();
        continue;
      }
      stream.write(`event: board\ndata: ${data}\n\n`);
    }
  }
  board.on('change', broadcast);
  function key(urls) {
    return JSON.stringify([...urls]);
  }
  const screenshotTimer = setInterval(() => {
    if (!streams.size) return;
    const before = key(screenshots);
    if (key(screenshotUrls(screenshotDir)) !== before) broadcast(board.snapshot());
  }, 1000);
  async function tick() {
    try {
      await board.tick();
    } catch (error) {
      console.error('Queue coordinator failed:', error);
      await board
        .transact(() => {
          board.data.paused = true;
          board.data.queueError = `Coordinator stopped: ${error.message}`;
        })
        .catch(persistenceError => console.error('Could not persist queue failure:', persistenceError));
    }
  }
  const timer = polling ? setInterval(tick, 1500) : null;
  return {
    board,
    server,
    listen(port = 4330) {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
      });
    },
    async close() {
      if (timer) clearInterval(timer);
      clearInterval(screenshotTimer);
      for (const stream of streams) stream.end();
      if (server.listening)
        await new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    },
  };
}

async function main() {
  if (process.env.HERDR_ENV !== '1') throw new Error('Launch this server inside Herdr.');
  const cloudRoot = path.resolve(repositoryRoot, '../tulipfarm-cloud');
  await mkdir(boardDataDir, { recursive: true });
  await withLock(
    path.join(boardDataDir, 'server.lock'),
    async () => {
      const inventory = await buildInventory(cloudRoot);
      await writeJson(path.join(boardDataDir, 'inventory.json'), inventory);
      const dispatcher = createDispatcher({
        root: repositoryRoot,
        cloudRoot,
        dataDir: boardDataDir,
      });
      const app = await createBoardServer({
        dataDir: boardDataDir,
        inventory,
        dispatcher,
      });
      try {
        const url = await app.listen(4330);
        console.log(
          `Sprout component board: ${url}\n${inventory.cards.length} component modules. PICK launches up to ${maxPicked} Opus 5.5 workers in the main checkout.\nChecks are serialized. Cloud is read-only. No commits or pushes.`,
        );
        await new Promise((resolve, reject) => {
          for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => app.close().then(resolve, reject));
        });
      } catch (error) {
        await app.close();
        throw error;
      }
    },
    { wait: false },
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

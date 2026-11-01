// Minimal docs viewer for this repository.
// The repo itself is Markdown-only, so the preview renders the Markdown files
// that live in it. Every request reads the file from disk, so edits to the
// Markdown show up on reload (and the page reloads itself when a file changes).
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';

const PAGES = {
  '/': { file: 'README.md', title: 'Every Programmer Should Know', markdown: true },
  '/contributing': { file: 'CONTRIBUTING.md', title: 'Contributing', markdown: true },
  '/license': { file: 'LICENSE', title: 'License', markdown: false },
};

const NAV = [
  { href: '/', label: 'Readme' },
  { href: '/contributing', label: 'Contributing' },
  { href: '/license', label: 'License' },
];

// GitHub-style :shortcode: emojis used by this repo.
const EMOJI = {
  page_facing_up: '📄',
  book: '📖',
  books: '📚',
  link: '🔗',
  movie_camera: '🎥',
  scroll: '📜',
  zap: '⚡',
  newspaper: '📰',
  globe_with_meridians: '🌐',
  white_check_mark: '✅',
  thinking: '🤔',
  star: '⭐',
  recycle: '♻️',
  point_up: '☝️',
  muscle: '💪',
  moneybag: '💰',
  house: '🏠',
  heart: '❤️',
  hammer: '🔨',
  fire: '🔥',
  dog: '🐕',
  bomb: '💣',
};

const STYLE = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 16px; line-height: 1.65;
    color: #1f2328; background: #ffffff;
  }
  header {
    position: sticky; top: 0; z-index: 10;
    display: flex; flex-wrap: wrap; align-items: center; gap: 1rem;
    padding: 0.75rem 1.5rem;
    background: rgba(255,255,255,.92); backdrop-filter: blur(8px);
    border-bottom: 1px solid #d8dee4;
  }
  header .brand { font-weight: 700; letter-spacing: -0.01em; }
  header nav { display: flex; gap: 0.25rem; }
  header nav a {
    padding: 0.3rem 0.7rem; border-radius: 6px;
    color: #57606a; text-decoration: none; font-size: 0.9rem;
  }
  header nav a:hover { background: #f3f4f6; color: #1f2328; }
  header nav a[aria-current="page"] { background: #eef1f4; color: #1f2328; font-weight: 600; }
  main { max-width: 52rem; margin: 0 auto; padding: 2rem 1.5rem 5rem; }
  h1, h2, h3 { line-height: 1.25; letter-spacing: -0.015em; margin: 2rem 0 0.75rem; }
  h1 { font-size: 2rem; margin-top: 0; }
  h2 { font-size: 1.4rem; padding-bottom: 0.35rem; border-bottom: 1px solid #eaeef2; }
  h3 { font-size: 1.15rem; }
  a { color: #0969da; }
  ul { padding-left: 1.4rem; }
  li { margin: 0.2rem 0; }
  li > ul { margin: 0.2rem 0; }
  blockquote {
    margin: 1.25rem 0; padding: 0.5rem 1rem;
    border-left: 4px solid #d0d7de; color: #57606a;
  }
  code {
    background: #f3f4f6; padding: 0.15em 0.35em;
    border-radius: 4px; font-size: 0.9em;
  }
  pre {
    background: #f6f8fa; padding: 1rem; border-radius: 8px;
    overflow-x: auto; font-size: 0.875rem;
  }
  pre code { background: none; padding: 0; }
  hr { border: 0; border-top: 1px solid #eaeef2; margin: 2rem 0; }
  img { max-width: 100%; height: auto; }
  footer {
    max-width: 52rem; margin: 0 auto; padding: 1rem 1.5rem 3rem;
    color: #6e7781; font-size: 0.8rem;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #e6edf3; background: #0d1117; }
    header { background: rgba(13,17,23,.92); border-bottom-color: #30363d; }
    header nav a { color: #9198a1; }
    header nav a:hover { background: #161b22; color: #e6edf3; }
    header nav a[aria-current="page"] { background: #21262d; color: #e6edf3; }
    h2 { border-bottom-color: #21262d; }
    a { color: #4493f8; }
    blockquote { border-left-color: #30363d; color: #9198a1; }
    code, pre { background: #161b22; }
    hr { border-top-color: #21262d; }
    footer { color: #9198a1; }
  }
`;

function emojify(html) {
  return html.replace(/:([a-z0-9_+-]+):/g, (match, name) => EMOJI[name] ?? match);
}

// Link Markdown files inside the repo to their viewer route.
function rewriteLinks(html) {
  return html.replace(/href="([^":#]+)\.md(#[^"]*)?"/gi, (match, target, hash = '') => {
    const route = `/${target.split('/').pop().replace(/\.md$/i, '').toLowerCase()}`;
    return `href="${route}${hash}"`;
  });
}

function layout({ title, current, body }) {
  const nav = NAV.map(
    (item) =>
      `<a href="${item.href}"${item.href === current ? ' aria-current="page"' : ''}>${item.label}</a>`
  ).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>${STYLE}</style>
</head>
<body>
  <header>
    <span class="brand">${PAGES['/'].title}</span>
    <nav>${nav}</nav>
  </header>
  <main>${body}</main>
  <footer>Rendered from this repository's Markdown.</footer>
  <script>
    (function () {
      let last = null;
      setInterval(async function () {
        try {
          const current = await (await fetch('/api/state', { cache: 'no-store' })).text();
          if (last !== null && current !== last) location.reload();
          last = current;
        } catch (e) { /* server restarting */ }
      }, 1500);
    })();
  </script>
</body>
</html>`;
}

async function readDoc(file) {
  return fs.readFile(path.join(ROOT, file), 'utf8');
}

async function renderPage(route, page) {
  const source = await readDoc(page.file);
  const body = page.markdown
    ? rewriteLinks(emojify(marked.parse(source)))
    : `<pre><code>${source.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c])}</code></pre>`;
  return layout({ title: page.title, current: route, body });
}

async function state() {
  const entries = await Promise.all(
    Object.values(PAGES).map(async (page) => {
      try {
        const stat = await fs.stat(path.join(ROOT, page.file));
        return `${page.file}:${stat.mtimeMs}:${stat.size}`;
      } catch {
        return `${page.file}:missing`;
      }
    })
  );
  return entries.join('|');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const route = url.pathname.replace(/\/+$/, '') || '/';

  if (route === '/api/state') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end(await state());
    return;
  }

  const page = PAGES[route];
  if (!page) {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(
      layout({
        title: 'Not found',
        current: route,
        body: '<h1>Not found</h1><p>That page does not exist. Try the <a href="/">readme</a>.</p>',
      })
    );
    return;
  }

  try {
    const html = await renderPage(route, page);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Failed to render ${page.file}: ${error.message}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Docs preview listening on http://${HOST}:${PORT}`);
});

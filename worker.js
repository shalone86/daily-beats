// A real page for every daily beat, built from catalog.json, so search
// engines (and people following a link) can find each one on its own:
//   /beat/<day>-<title>     one beat: player, details, chords, lyrics, notes
//   /sitemap.xml            the home page plus every beat page
// Everything else is the static site in this folder, served by Cloudflare
// before this code runs. The home page is unchanged.

// index.html's slugify, kept identical.
const slugify = (text) => text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${MONTH_ABBR[+m[2] - 1]} ${+m[3]}, ${m[1]}` : '';
};
const text = (v) => (v == null ? '' : String(v).trim());
const beatPath = (b) => `/beat/${b.slug}`;

const SITE = {
  url: 'https://shalonely.com',
  media: 'https://daily.shalonely.com',
  name: "Shalone's Daily Beats",
  artist: 'Shalone Cason',
  homeLabel: "Shalone's Daily Beats · All beats",
  footer: "Shalone's Daily Beats · CC0 Public Domain · Free to hear, download and reuse",
  image: 'https://shalonely.com/social-preview.jpg',
  theme: {
    bg: '#121214', card: '#1b1b1e', line: '#2e2e34', text: '#e4e4e7', muted: '#a1a1aa', accent: '#e0a868', size: '17px',
    heading: "'JetBrains Mono', 'Fira Code', monospace", body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontFaces: "@font-face { font-family: 'JetBrains Mono'; font-weight: 500 700; font-display: swap; src: url('/fonts/jetbrains-mono.woff2') format('woff2'); }"
  },
  build(catalog) {
    const songs = [];
    for (const album of catalog) {
      for (const t of album && Array.isArray(album.tracks) ? album.tracks : []) {
        // A bad entry is skipped, like on the main page.
        if (!t || typeof t.path !== 'string' || !t.path.trim()) continue;
        songs.push({
          title: text(t.title) || 'Untitled', day: parseInt(t.day, 10) || 0, date: text(t.date),
          url: mediaUrl(t.path), fileName: t.path.split('/').pop(),
          genre: text(t.genre), bpm: text(t.bpm), key: text(t.key), vocals: text(t.vocals),
          description: text(t.description), chords: text(t.chords), lyrics: text(t.lyrics)
        });
      }
    }
    songs.sort((a, b) => b.day - a.day || a.title.localeCompare(b.title));
    const used = new Set();
    for (const s of songs) {
      s.slug = uniqueSlug(s.day ? `${s.day}-${slugify(s.title)}` : slugify(s.title), used);
      s.mainLink = s.day ? `/#day-${s.day}` : `/#track-${slugify(s.title)}`;
    }
    return songs;
  },
  sitemap: (songs) => ['/', ...songs.map(beatPath)],
  handles: (parts) => parts[0] === 'beat' && parts.length === 2,
  shareItems: (songs) => songs.map((s) => ({
    ids: [s.day ? `day-${s.day}` : '', `track-${slugify(s.title)}`].filter(Boolean),
    title: `${s.title}${s.day ? ` — Day ${s.day}` : ''} — ${SITE.name}`, path: beatPath(s), image: SITE.image,
    description: `“${s.title}”, ${s.day ? `day ${s.day} of ` : ''}Shalone's daily beats${s.genre ? `: ${s.genre.toLowerCase()}` : ''}. Free to hear, download and reuse.`
  })),
  route(parts, songs) {
    const i = songs.findIndex((s) => s.slug === parts[1]);
    return i === -1 ? null : beatPage(songs[i], songs[i + 1], songs[i - 1]);
  }
};

function uniqueSlug(base, used) {
  let slug = base || 'untitled';
  while (used.has(slug)) slug += '-2';
  used.add(slug);
  return slug;
}

function beatPage(song, older, newer) {
  const when = formatDate(song.date);
  const label = [song.day ? `Day ${song.day}` : '', when].filter(Boolean).join(' · ');
  const facts = [song.genre, song.bpm && `${song.bpm} BPM`, song.key && `Key: ${song.key}`, song.vocals].filter(Boolean);
  const description = `“${song.title}”, ${song.day ? `day ${song.day} of ` : ''}Shalone's daily beats${when ? ` (${when})` : ''}${song.genre ? `: ${song.genre.toLowerCase()}` : ''}${song.bpm ? `, ${song.bpm} BPM` : ''}. Human-made, free to hear, download and reuse under CC0 (public domain).`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    url: SITE.url + beatPath(song),
    byArtist: { '@type': 'MusicGroup', name: SITE.artist, url: 'https://albums.shalonely.com/' },
    inAlbum: { '@type': 'MusicAlbum', name: SITE.name, url: `${SITE.url}/` },
    ...(song.date ? { datePublished: song.date } : {}),
    ...(song.genre ? { genre: song.genre } : {}),
    audio: { '@type': 'AudioObject', contentUrl: song.url },
    license: CC0,
    ...(song.lyrics ? { recordingOf: { '@type': 'MusicComposition', name: song.title, lyrics: { '@type': 'CreativeWork', text: song.lyrics } } } : {})
  };
  const nav = [newer && ['Newer', newer], older && ['Older', older]].filter(Boolean);
  const body = `
    <div class="grid solo">
      <div>
        <div class="eyebrow">${esc(label)}</div>
        <h1>${esc(song.title)}</h1>
        <p class="sub">A daily beat by <a href="https://albums.shalonely.com/">${esc(SITE.artist)}</a></p>
        ${facts.length ? `<div class="facts">${facts.map((f) => `<span class="fact">${esc(f)}</span>`).join('')}</div>` : ''}
        <audio controls preload="none" src="${esc(song.url)}"></audio>
        <div class="actions">
          <a class="btn btn-primary" href="${esc(song.mainLink)}">Open in the full player</a>
          <a class="btn" href="${esc(song.url)}" download="${esc(song.fileName)}">Download</a>
        </div>
        ${song.description ? `<h2>Notes</h2><p class="text">${esc(song.description)}</p>` : ''}
        ${song.chords ? `<h2>Chords</h2><p class="text chords">${esc(song.chords)}</p>` : ''}
        ${song.lyrics ? `<h2>Lyrics</h2><p class="text">${esc(song.lyrics)}</p>` : ''}
        ${nav.length ? `<h2>More beats</h2>${trackList(nav.map(([word, s]) => ({ href: beatPath(s), num: word, title: `${s.day ? `Day ${s.day}: ` : ''}${s.title}` })))}` : ''}
      </div>
    </div>`;
  return page({ title: `${song.title}${song.day ? ` — Day ${song.day}` : ''} — ${SITE.name}`, description, path: beatPath(song), image: SITE.image, jsonLd, body });
}
// ---------- Shared page code (the same in every site's worker.js) ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// JSON-LD sits inside a <script>, so "<" must not close it early.
const ld = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');
const mediaUrl = (path) => `${SITE.media}/${String(path).split('/').map(encodeURIComponent).join('/')}`;
const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';

let cached = { at: 0, data: null };
async function loadCatalog() {
  // Kept in memory for a minute and cached at Cloudflare for five, so new
  // uploads show up quickly without fetching the catalog on every page.
  if (cached.data && Date.now() - cached.at < 60000) return cached.data;
  const res = await fetch(`${SITE.media}/catalog.json`, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error(`catalog.json: HTTP ${res.status}`);
  const catalog = await res.json();
  if (!Array.isArray(catalog)) throw new Error('catalog.json is not a list');
  cached = { at: Date.now(), data: SITE.build(catalog) };
  return cached.data;
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': `default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: ${SITE.media}; media-src ${SITE.media}; frame-ancestors 'none'`
    }
  });
}

function sitemapResponse(paths) {
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map((p) => `  <url><loc>${esc(SITE.url + p)}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}

function page({ title, description, path, image, jsonLd, body, noindex = false, refresh = '' }) {
  const canonical = SITE.url + path;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(canonical)}">`}
  ${refresh ? `<meta http-equiv="refresh" content="0; url=${esc(refresh)}">` : ''}
  <meta name="theme-color" content="${SITE.theme.bg}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta property="og:site_name" content="${esc(SITE.name)}">
  ${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  ${jsonLd ? `<script type="application/ld+json">${ld(jsonLd)}</script>` : ''}
  <style>
    ${SITE.theme.fontFaces}
    :root { color-scheme: dark; --bg: ${SITE.theme.bg}; --card: ${SITE.theme.card}; --line: ${SITE.theme.line}; --text: ${SITE.theme.text}; --muted: ${SITE.theme.muted}; --accent: ${SITE.theme.accent};
      --heading: ${SITE.theme.heading}; --body: ${SITE.theme.body}; --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: var(--body); font-size: ${SITE.theme.size}; line-height: 1.55; font-variant-numeric: lining-nums; }
    a { color: inherit; }
    .wrap { max-width: 1000px; margin: 0 auto; padding: 28px 16px 64px; }
    .home { display: inline-block; font-family: var(--sans); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); text-decoration: none; margin-bottom: 28px; }
    .home:hover { color: var(--accent); }
    .grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 44px; align-items: start; }
    .grid.solo { grid-template-columns: minmax(0, 1fr); max-width: 720px; }
    .cover { width: 100%; height: auto; aspect-ratio: 1; object-fit: cover; display: block; border-radius: 8px; border: 1px solid var(--line); background: var(--card); }
    .eyebrow { font-family: var(--sans); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); }
    .eyebrow a { text-decoration: none; }
    h1 { font-family: var(--heading); font-weight: 600; font-size: clamp(1.9rem, 5vw, 2.9rem); line-height: 1.12; color: var(--text); margin: 10px 0 8px; overflow-wrap: anywhere; }
    .sub { color: var(--muted); }
    .sub a { color: var(--text); }
    .facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    .fact { font-family: var(--sans); font-size: 0.78rem; padding: 4px 10px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 22px 0; }
    .btn { display: inline-flex; align-items: center; height: 40px; padding: 0 18px; border: 1px solid var(--line); border-radius: 999px; font-family: var(--sans); font-size: 0.8rem; font-weight: 600; text-decoration: none; color: var(--text); }
    .btn:hover { border-color: var(--accent); color: var(--accent); }
    .btn-primary { background: var(--accent); border-color: var(--accent); color: #111; }
    .btn-primary:hover { color: #111; filter: brightness(1.1); }
    ol { list-style: none; border-top: 1px solid var(--line); }
    li { border-bottom: 1px solid var(--line); }
    li a { display: flex; gap: 14px; align-items: baseline; padding: 11px 4px; text-decoration: none; }
    li a:hover { color: var(--accent); }
    .num { font-family: var(--sans); font-size: 0.75rem; color: var(--muted); min-width: 1.8em; text-align: right; flex-shrink: 0; }
    audio { width: 100%; margin: 20px 0 4px; }
    h2 { font-family: var(--heading); font-weight: 600; font-size: 1.3rem; color: var(--text); margin: 30px 0 10px; }
    .text { white-space: pre-line; }
    .chords { font-family: ui-monospace, 'JetBrains Mono', monospace; font-size: 0.9rem; color: var(--muted); }
    footer { margin-top: 56px; padding-top: 22px; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.9rem; text-align: center; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; gap: 26px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <a class="home" href="/">← ${esc(SITE.homeLabel)}</a>
    ${body}
    <footer>${esc(SITE.footer)}</footer>
  </div>
</body>
</html>`;
}

function notFoundPage(message) {
  return page({ title: SITE.name, description: message, path: '/', noindex: true, body: `<h1>${esc(message)}</h1><p class="sub"><a href="/">Go to ${esc(SITE.name)}</a></p>` });
}

// Share links: /listen/<id> shows the album's or song's own title and cover
// to link previews (texts, social posts), then sends people straight on to
// /#<id> on the main page, the same place the old share links went.
// It isn't indexed by search; the real page is.
function sharePage(id, data) {
  const target = `/#${id}`;
  const item = SITE.shareItems(data).find((i) => i.ids.includes(id));
  if (!item) return null;
  return page({ ...item, noindex: true, refresh: target,
    body: `<h1>${esc(item.title)}</h1><p class="sub"><a href="${esc(target)}">Open on ${esc(SITE.name)}</a></p>` });
}

const trackList = (items) => `<ol>${items.map((i) => `<li><a href="${esc(i.href)}"><span class="num">${esc(i.num)}</span><span>${esc(i.title)}</span></a></li>`).join('')}</ol>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let parts;
    try { parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent); } catch (e) { parts = []; }
    try {
      if (url.pathname === '/sitemap.xml') return sitemapResponse(SITE.sitemap(await loadCatalog()));
      if (parts[0] === 'listen' && parts.length === 2) {
        const out = sharePage(parts[1], await loadCatalog());
        if (out) return html(out);
        return Response.redirect(`${url.origin}/#${encodeURIComponent(parts[1])}`, 302);
      }
      if (SITE.handles(parts)) {
        const out = SITE.route(parts, await loadCatalog());
        if (out) return html(out);
      }
    } catch (err) {
      console.error('Pages:', err);
      // A share link still gets people to the main page.
      if (parts[0] === 'listen' && parts.length === 2) return Response.redirect(`${url.origin}/#${encodeURIComponent(parts[1])}`, 302);
      return html(notFoundPage('This page couldn’t load right now. Please try again in a minute.'), 503);
    }
    // Anything else: the site's static files, or a friendly not-found page.
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    return html(notFoundPage('That page isn’t here.'), 404);
  }
};

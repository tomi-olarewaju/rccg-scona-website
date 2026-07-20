// Returns the parish's most recent YouTube uploads as JSON.
//
// Why this exists: YouTube's RSS feed does not send CORS headers, so the
// browser cannot read it directly. This function fetches the feed server-side
// and re-serves it from our own origin, which lets the Watch page list current
// services without anyone hand-editing video IDs.

const CHANNEL_ID = 'UCzvTHbLCrNOadRYDHbtL59g'; // RCCG SCONA TV
const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const LIMIT = 6;

// Channel titles carry a lot of boilerplate, e.g.
//   "THANKSGIVING SUNDAY AT RCCG SOLUTION CENTER FOR ALL NATIONS 07/05/2026"
// Keep only the descriptive part before the parish name, drop trailing dates,
// and convert the SHOUTING to title case.
function cleanTitle(raw) {
  const head = String(raw).split(/\bat\s+rccg\b|\brccg\b/i)[0] || '';
  const trimmed = head
    .replace(/\d{1,2}\s*[/.-]+\s*\d{1,2}\s*[/.-]+\s*\d{2,4}/g, '') // dates
    .replace(/[\s/(),.-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (trimmed.length < 3) return 'Sunday Service';
  return trimmed
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function parseFeed(xml) {
  const videos = [];
  const entries = xml.split('<entry>').slice(1);
  for (const entry of entries) {
    const id = /<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(entry);
    const title = /<title>([\s\S]*?)<\/title>/.exec(entry);
    const published = /<published>(.*?)<\/published>/.exec(entry);
    if (!id) continue;
    videos.push({
      id: id[1],
      title: cleanTitle(title ? title[1] : ''),
      date: published ? formatDate(published[1]) : '',
      published: published ? published[1] : '',
    });
    if (videos.length >= LIMIT) break;
  }
  return videos;
}

export default async () => {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    // Cache at the CDN so repeat visits do not re-hit YouTube.
    'cache-control': 'public, max-age=900, s-maxage=1800',
  };

  try {
    const res = await fetch(FEED, {
      headers: { 'user-agent': 'rccg-scona-website/1.0 (+https://rccg-scona-preview.netlify.app)' },
    });
    if (!res.ok) throw new Error(`feed responded ${res.status}`);

    const videos = parseFeed(await res.text());
    if (!videos.length) throw new Error('no entries parsed');

    return new Response(JSON.stringify({ videos }), { headers });
  } catch (err) {
    // The page keeps its built-in fallback tiles when this fails.
    return new Response(JSON.stringify({ videos: [], error: String(err.message || err) }), {
      status: 502,
      headers: { ...headers, 'cache-control': 'no-store' },
    });
  }
};
